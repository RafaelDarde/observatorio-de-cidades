"""Novo CAGED (MTE): admissões, desligamentos e saldo mensal por município e grande setor.

Usa só o CAGEDMOV (movimentações declaradas no prazo). Cada mês (~450 MB de texto) é resumido
num Parquet pequeno logo após o download; o bruto é apagado.
"""
import ftplib
import logging
import re
import tempfile
from pathlib import Path
from typing import Callable
from urllib.parse import quote

import duckdb
import py7zr

from observatorio import rede
from observatorio.banco import substituir_fatos
from observatorio.config import CACHE_DIR, CAGED_MESES

log = logging.getLogger(__name__)

FTP_HOST = "ftp.mtps.gov.br"
BASE = "/pdet/microdados/NOVO CAGED"
FONTE = "caged"
DIR = CACHE_DIR / "caged"
COLUNAS_ESPERADAS = [
    "competênciamov", "região", "uf", "município", "seção", "subclasse", "saldomovimentação",
    "cbo2002ocupação", "categoria", "graudeinstrução", "idade", "horascontratuais", "raçacor", "sexo",
    "tipoempregador", "tipoestabelecimento", "tipomovimentação", "tipodedeficiência",
    "indtrabintermitente", "indtrabparcial", "salário", "tamestabjan", "indicadoraprendiz",
    "origemdainformação", "competênciadec", "indicadordeforadoprazo", "unidadesaláriocódigo",
    "valorsaláriofixo",
]
GRANDE_SETOR = {"A": "Agropecuária", "B": "Indústria", "C": "Indústria", "D": "Indústria",
                "E": "Indústria", "F": "Construção", "G": "Comércio"}  # demais seções: Serviços


class LayoutInesperado(Exception):
    pass


def meses_disponiveis(listar: Callable[[str], list[str]]) -> list[str]:
    meses = []
    for ano in (n for n in listar("") if re.fullmatch(r"\d{4}", n)):
        meses += [f"{m[:4]}-{m[4:]}" for m in listar(ano) if re.fullmatch(r"\d{6}", m)]
    return sorted(meses)


def resumir(arquivo_txt: Path, destino: Path) -> Path:
    with open(arquivo_txt, encoding="utf-8") as f:
        colunas = f.readline().rstrip("\r\n").split(";")
    if colunas != COLUNAS_ESPERADAS:
        faltando = [c for c in COLUNAS_ESPERADAS if c not in colunas]
        sobrando = [c for c in colunas if c not in COLUNAS_ESPERADAS]
        raise LayoutInesperado(f"layout do CAGED mudou em {arquivo_txt.name}: "
                               f"faltando={faltando} sobrando={sobrando}")
    destino.parent.mkdir(parents=True, exist_ok=True)
    caminho = str(arquivo_txt).replace("'", "''")
    local = duckdb.connect()
    local.execute("set enable_progress_bar = false")
    local.execute(f"""
        copy (
            select "competênciamov" as comp, "município" as mun, "seção" as secao,
                   count(*) filter (where "saldomovimentação" = '1') as adm,
                   count(*) filter (where "saldomovimentação" = '-1') as desl
            from read_csv('{caminho}', delim=';', header=true, all_varchar=true)
            group by all
        ) to '{str(destino).replace("'", "''")}' (format parquet)
    """)
    return destino


def agregar(con, resumos: list[Path]) -> tuple[list[tuple], int]:
    arquivos = [str(p) for p in resumos]
    con.execute("create or replace temp table _caged as select r.*, m.cod_municipio from "
                "read_parquet(?) r left join municipios m on m.cod6 = r.mun", [arquivos])
    descartadas = con.execute(
        "select coalesce(sum(adm + desl), 0) from _caged where cod_municipio is null").fetchone()[0]
    casos = " ".join(f"when '{s}' then '{g}'" for s, g in GRANDE_SETOR.items())
    linhas = con.execute(f"""
        with base as (
            select cod_municipio, substr(comp, 1, 4) || '-' || substr(comp, 5, 2) as periodo,
                   case secao {casos} else 'Serviços' end as setor, adm, desl
            from _caged where cod_municipio is not null
        ), somas as (
            select cod_municipio, periodo, setor, sum(adm) as adm, sum(desl) as desl
            from base group by grouping sets ((cod_municipio, periodo), (cod_municipio, periodo, setor))
        )
        select cod_municipio, 'caged_admissoes', periodo, setor, adm from somas
        union all select cod_municipio, 'caged_desligamentos', periodo, setor, desl from somas
        union all select cod_municipio, 'caged_saldo', periodo, setor, adm - desl from somas
    """).fetchall()
    con.execute("drop table _caged")
    return [(c, i, p, s, float(v)) for c, i, p, s, v in linhas], int(descartadas)


def _listar_ftp() -> Callable[[str], list[str]]:
    ftp = ftplib.FTP(FTP_HOST, encoding="latin-1", timeout=60)
    ftp.login()

    def listar(caminho: str) -> list[str]:
        alvo = f"{BASE}/{caminho}".rstrip("/")
        return [n.rsplit("/", 1)[-1] for n in ftp.nlst(alvo)]

    return listar


def baixar() -> list[Path]:
    meses = meses_disponiveis(_listar_ftp())[-CAGED_MESES:]
    resumos = []
    for mes in meses:
        aaaamm = mes.replace("-", "")
        resumo = DIR / f"{aaaamm}.parquet"
        if not resumo.exists():
            url = f"ftp://{FTP_HOST}{quote(BASE)}/{aaaamm[:4]}/{aaaamm}/CAGEDMOV{aaaamm}.7z"
            with tempfile.TemporaryDirectory(dir=CACHE_DIR) as tmp:
                arquivo_7z = rede.baixar(url, Path(tmp) / f"CAGEDMOV{aaaamm}.7z", timeout=300)
                with py7zr.SevenZipFile(arquivo_7z) as z:
                    z.extractall(tmp)
                resumir(Path(tmp) / f"CAGEDMOV{aaaamm}.txt", resumo)
            log.info("CAGED %s resumido", mes)
        resumos.append(resumo)
    return resumos


def carregar(con) -> int:
    resumos = sorted(DIR.glob("*.parquet"))[-CAGED_MESES:]
    tuplas, descartadas = agregar(con, resumos)
    log.info("CAGED: %d movimentações de municípios fora do recorte ou sem correspondência", descartadas)
    return substituir_fatos(con, FONTE, tuplas)
