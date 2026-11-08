"""Lista oficial de municípios (API de localidades do IBGE)."""
import json
from pathlib import Path

from observatorio import rede
from observatorio.config import cache_do_dia

URL = "https://servicodados.ibge.gov.br/api/v1/localidades/municipios"
def _arquivo():
    return cache_do_dia("ibge_municipios") / "municipios.json"


def parse(dados: list[dict]) -> list[tuple[str, str, str, str, str]]:
    linhas = []
    for m in dados:
        if m.get("microrregiao"):
            uf = m["microrregiao"]["mesorregiao"]["UF"]
        else:
            uf = m["regiao-imediata"]["regiao-intermediaria"]["UF"]
        cod = str(m["id"])
        linhas.append((cod, cod[:6], m["nome"], uf["sigla"], uf["regiao"]["nome"]))
    return linhas


def _ler() -> list[dict]:
    return json.loads(_arquivo().read_text(encoding="utf-8"))


def baixar() -> list[Path]:
    return [rede.baixar(URL, _arquivo())]


def carregar(con) -> int:
    linhas = parse(_ler())
    con.execute("begin")
    con.execute("delete from municipios")
    con.executemany("insert into municipios values (?, ?, ?, ?, ?)", linhas)
    con.execute("commit")
    return len(linhas)


def total_api() -> int:
    return len(_ler())
