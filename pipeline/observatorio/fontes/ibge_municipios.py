"""Lista oficial de municípios (API de localidades do IBGE)."""
import json
from pathlib import Path

from observatorio import rede
from observatorio.config import CACHE_DIR, cache_do_dia
from observatorio.recorte import carregar_recorte

URL = "https://servicodados.ibge.gov.br/api/v1/localidades/municipios"
def _arquivo():
    return cache_do_dia("ibge_municipios") / "municipios.json"


def parse(dados: list[dict], codigos: set[str] | None = None) -> list[tuple[str, str, str, str, str]]:
    linhas = []
    for m in dados:
        if codigos is not None and str(m["id"]) not in codigos:
            continue
        if m.get("microrregiao"):
            uf = m["microrregiao"]["mesorregiao"]["UF"]
        else:
            uf = m["regiao-imediata"]["regiao-intermediaria"]["UF"]
        cod = str(m["id"])
        linhas.append((cod, cod[:6], m["nome"], uf["sigla"], uf["regiao"]["nome"]))
    return linhas


CACHE_FONTE = CACHE_DIR / "ibge_municipios"


def _ler() -> list[dict]:
    # O cache mais recente, mesmo de outro dia (ex.: `atualizar --fonte caged` não baixa municípios).
    arquivos = sorted(CACHE_FONTE.glob("*/municipios.json"))
    if not arquivos:
        raise FileNotFoundError(f"lista de municípios ainda não baixada (nada em {CACHE_FONTE})")
    arquivo = arquivos[-1]
    return json.loads(arquivo.read_text(encoding="utf-8"))


def baixar() -> list[Path]:
    return [rede.baixar(URL, _arquivo())]


def carregar(con) -> int:
    linhas = parse(_ler(), set(carregar_recorte().municipios))
    con.execute("begin")
    con.execute("delete from municipios")
    con.executemany("insert into municipios values (?, ?, ?, ?, ?)", linhas)
    con.execute("commit")
    return len(linhas)


def total_esperado() -> int:
    return len(carregar_recorte().municipios)
