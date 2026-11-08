"""População: estimativas anuais (SIDRA 6579) e Censo 2022 (SIDRA 4709)."""
import json
from pathlib import Path

from observatorio import rede
from observatorio.banco import substituir_fatos
from observatorio.config import cache_do_dia
from observatorio.sidra import parse_sidra, url_sidra

TABELA_ESTIMATIVAS, VAR_ESTIMATIVAS = 6579, 9324
TABELA_CENSO, VAR_CENSO = 4709, 93
FONTE = "ibge_populacao"

ARQUIVOS = {
    "estimativas": (TABELA_ESTIMATIVAS, VAR_ESTIMATIVAS, "last 10", "n6/all"),
    "censo": (TABELA_CENSO, VAR_CENSO, "2022", "n6/all"),
    "estimativas_brasil": (TABELA_ESTIMATIVAS, VAR_ESTIMATIVAS, "last 10", "n1/all"),
    "censo_brasil": (TABELA_CENSO, VAR_CENSO, "2022", "n1/all"),
}


def _por_chave(linhas: list[dict]) -> dict[tuple[str, str], float]:
    return {(l["Município (Código)"], l["Ano (Código)"]): l["Valor"] for l in linhas}


def normalizar(linhas_estimativas: list[dict], linhas_censo: list[dict]) -> list[tuple]:
    valores = _por_chave(linhas_estimativas) | _por_chave(linhas_censo)
    return [(cod, "populacao", ano, None, v) for (cod, ano), v in sorted(valores.items())]


def _caminho(nome: str) -> Path:
    return cache_do_dia(FONTE) / f"{nome}.json"


def baixar() -> list[Path]:
    return [rede.baixar(url_sidra(t, [v], p, territorio=n), _caminho(nome))
            for nome, (t, v, p, n) in ARQUIVOS.items()]


def _ler(nome: str) -> list[dict]:
    return parse_sidra(json.loads(_caminho(nome).read_text(encoding="utf-8")))


def carregar(con) -> int:
    n = substituir_fatos(con, FONTE, normalizar(_ler("estimativas"), _ler("censo")))
    brasil = {ano: v for (_, ano), v in
              (_por_chave(_brasil(_ler("estimativas_brasil"))) | _por_chave(_brasil(_ler("censo_brasil")))).items()}
    con.execute("delete from referencias where indicador = 'populacao'")
    con.executemany("insert into referencias values ('populacao', ?, ?)", sorted(brasil.items()))
    return n


def _brasil(linhas: list[dict]) -> list[dict]:
    # No nível Brasil (n1) a chave territorial é "Brasil (Código)"; uniformiza para reaproveitar _por_chave.
    return [{"Município (Código)": "BR", "Ano (Código)": l["Ano (Código)"], "Valor": l["Valor"]} for l in linhas]
