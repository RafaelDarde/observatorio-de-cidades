"""SSP-RS — Indicadores Criminais: ocorrências anuais por município (planilhas da página oficial).

A SSP publica uma planilha .xlsx por ano, com nomes de arquivo imprevisíveis; os links são lidos
da página. Cada planilha tem uma aba com o número do ano (totais por município) além das mensais.
Só anos completos (até 31 de dezembro) entram: o ano corrente parcial distorceria as taxas anuais.

O total do RS (soma dos municípios) vai para a tabela `referencias`, base do índice de violência.
"""
import logging
import re
import unicodedata
import urllib.request
from pathlib import Path
from urllib.parse import urljoin

import openpyxl

from observatorio import rede
from observatorio.banco import substituir_fatos
from observatorio.config import cache_do_dia

log = logging.getLogger(__name__)

FONTE = "ssp_rs"
PAGINA = "https://www.ssp.rs.gov.br/indicadores-criminais"
# Antes de 2022 a população não é comparável (série começa no Censo 2022).
ANO_INICIAL = 2022
# O firewall da SSP rejeita clientes sem cara de navegador.
CABECALHOS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) "
                  "Chrome/140.0 Safari/537.36",
    "Accept-Language": "pt-BR,pt;q=0.9",
}
# indicador -> trecho do cabeçalho da coluna (normalizado, sem acento e em maiúsculas)
COLUNAS = {
    "seg_cvli": "TOTAL DE VITIMAS DE CVLI",
    "seg_roubos": "ROUBOS",
    "seg_furtos": "FURTOS",
}


class LayoutInesperado(Exception):
    pass


def normalizar_nome(texto) -> str:
    sem_acento = unicodedata.normalize("NFKD", str(texto)).encode("ascii", "ignore").decode()
    return re.sub(r"\s+", " ", sem_acento.replace("*", "")).strip().upper()


def links_anuais(html: str, base: str = PAGINA) -> dict[int, str]:
    """Ano -> URL da planilha anual por município. A página lista do mais novo ao mais antigo."""
    links: dict[int, str] = {}
    for href in re.findall(r'href="([^"]+\.xlsx)"', html, flags=re.IGNORECASE):
        nome = href.rsplit("/", 1)[-1].lower()
        achado = re.search(r"munic[^/]*?(20\d\d)", nome)
        if achado and int(achado.group(1)) >= ANO_INICIAL:
            links.setdefault(int(achado.group(1)), urljoin(base, href))
    return links


def ler_planilha(arquivo: Path) -> tuple[int, bool, dict[str, dict[str, float]]]:
    """(ano, ano completo?, {nome normalizado do município: {indicador: valor}})."""
    wb = openpyxl.load_workbook(arquivo, read_only=True, data_only=True)
    try:
        abas = [w for w in wb.worksheets if w.title.strip().isdigit()]
        if not abas:
            raise LayoutInesperado(f"{arquivo.name}: sem aba anual (abas: {wb.sheetnames})")
        aba = abas[0]
        ano = int(aba.title.strip())
        completo, indices, dados = False, None, {}
        for linha in aba.iter_rows(values_only=True):
            primeira = normalizar_nome(linha[0]) if linha and linha[0] is not None else ""
            if not primeira:
                continue
            if indices is None:
                if "31 DE DEZEMBRO" in primeira:
                    completo = True
                if primeira == "MUNICIPIOS":
                    cabecalho = [normalizar_nome(c) if c is not None else "" for c in linha]
                    indices = {}
                    for ind, trecho in COLUNAS.items():
                        pos = [i for i, c in enumerate(cabecalho) if c == trecho or c.startswith(trecho)]
                        if not pos:
                            raise LayoutInesperado(f"{arquivo.name}: coluna '{trecho}' não encontrada em {cabecalho}")
                        indices[ind] = pos[0]
                continue
            if primeira.startswith(("TOTAL", "FONTE", "NOTA", "OBS")):
                continue
            valores = {ind: linha[i] for ind, i in indices.items()}
            if all(isinstance(v, (int, float)) for v in valores.values()):
                dados[primeira] = {ind: float(v) for ind, v in valores.items()}
        if indices is None:
            raise LayoutInesperado(f"{arquivo.name}: cabeçalho 'Municípios' não encontrado na aba {aba.title}")
        return ano, completo, dados
    finally:
        wb.close()


def normalizar(planilhas: list[tuple[int, bool, dict]], municipios: dict[str, str]
               ) -> tuple[list[tuple], list[tuple]]:
    """Fatos dos municípios do recorte e referências do RS (soma de todos os municípios), anos completos."""
    por_nome = {normalizar_nome(nome): cod for cod, nome in municipios.items()}
    fatos, referencias = [], []
    for ano, completo, dados in planilhas:
        if not completo:
            log.info("SSP-RS %s: ano incompleto, ignorado", ano)
            continue
        faltando = sorted(set(por_nome) - set(dados))
        if faltando:
            raise LayoutInesperado(f"SSP-RS {ano}: municípios do recorte não encontrados: {faltando}")
        for nome, cod in por_nome.items():
            fatos += [(cod, ind, str(ano), None, v) for ind, v in dados[nome].items()]
        for ind in COLUNAS:
            referencias.append((ind, str(ano), sum(d[ind] for d in dados.values())))
    return fatos, referencias


def _abrir(url: str, timeout: int):
    return urllib.request.urlopen(urllib.request.Request(url, headers=CABECALHOS), timeout=timeout)


def _dir() -> Path:
    return cache_do_dia(FONTE)


def baixar() -> list[Path]:
    pagina = rede.baixar(PAGINA, _dir() / "pagina.html", abrir=_abrir)
    links = links_anuais(pagina.read_text(encoding="utf-8", errors="replace"))
    if not links:
        raise LayoutInesperado("nenhuma planilha anual encontrada na página da SSP-RS")
    return [rede.baixar(url, _dir() / f"{ano}.xlsx", abrir=_abrir, timeout=180) for ano, url in sorted(links.items())]


def carregar(con) -> int:
    arquivos = sorted(_ultimo_dir().glob("*.xlsx"))
    municipios = dict(con.execute("select cod_municipio, nome from municipios").fetchall())
    fatos, referencias = normalizar([ler_planilha(a) for a in arquivos], municipios)
    n = substituir_fatos(con, FONTE, fatos)
    con.execute("begin")
    con.execute("delete from referencias where indicador in (select unnest(?))", [list(COLUNAS)])
    con.executemany("insert into referencias values (?, ?, ?)", referencias)
    con.execute("commit")
    return n


def _ultimo_dir() -> Path:
    # O download mais recente, mesmo de outro dia (ex.: `atualizar --fonte caged` não baixa a SSP).
    dirs = sorted(p for p in _dir().parent.glob("*") if any(p.glob("*.xlsx")))
    if not dirs:
        raise FileNotFoundError(f"planilhas da SSP-RS ainda não baixadas (nada em {_dir().parent})")
    return dirs[-1]
