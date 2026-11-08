"""PIB dos Municípios (SIDRA 5938). PIB per capita é derivado (ver derivados.py)."""
import json
from pathlib import Path

from observatorio import rede
from observatorio.banco import substituir_fatos
from observatorio.config import cache_do_dia
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


def _caminho() -> Path:
    return cache_do_dia(FONTE) / "pib.json"


def baixar() -> list[Path]:
    return [rede.baixar(url_sidra(TABELA, list(VARIAVEIS), "last 5"), _caminho())]


def carregar(con) -> int:
    linhas = parse_sidra(json.loads(_caminho().read_text(encoding="utf-8")))
    return substituir_fatos(con, FONTE, normalizar(linhas))
