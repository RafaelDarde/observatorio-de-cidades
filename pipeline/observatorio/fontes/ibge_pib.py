"""PIB dos Municípios (SIDRA 5938). PIB per capita é derivado (ver derivados.py)."""
import json
from pathlib import Path

from observatorio import rede
from observatorio.banco import substituir_fatos
from observatorio.recorte import cache_do_recorte, territorio_sidra
from observatorio.sidra import parse_sidra, url_sidra

TABELA = 5938
FONTE = "ibge_pib"
VARIAVEIS: dict[int, str] = {
    37: "pib",
    513: "vab_agro",
    517: "vab_industria",
    6575: "vab_servicos",
    525: "vab_adm_publica",
}


def normalizar(linhas: list[dict]) -> list[tuple]:
    resultado = []
    for l in linhas:
        indicador = VARIAVEIS.get(int(l["Variável (Código)"]))
        if indicador:
            resultado.append((l["Município (Código)"], indicador, l["Ano (Código)"], None, l["Valor"]))
    return resultado


def urls() -> dict[str, str]:
    # Uma requisição por variável: todas juntas passam do limite de valores por consulta do SIDRA.
    return {f"pib_{v}": url_sidra(TABELA, [v], "last 5", territorio=territorio_sidra()) for v in VARIAVEIS}


def baixar() -> list[Path]:
    return [rede.baixar(url, cache_do_recorte(FONTE) / f"{nome}.json") for nome, url in urls().items()]


def carregar(con) -> int:
    linhas = [l for nome in urls() for l in parse_sidra(
        json.loads((cache_do_recorte(FONTE) / f"{nome}.json").read_text(encoding="utf-8")))]
    return substituir_fatos(con, FONTE, normalizar(linhas))
