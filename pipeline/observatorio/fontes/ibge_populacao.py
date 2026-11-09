"""População: estimativas anuais (SIDRA 6579) e Censo 2022 (SIDRA 4709).

Além dos municípios do recorte, baixa a população do RS inteiro, gravada em `referencias`
(base das taxas estaduais usadas no índice de violência).
"""
import json
from pathlib import Path

from observatorio import rede
from observatorio.banco import substituir_fatos
from observatorio.recorte import cache_do_recorte, territorio_sidra
from observatorio.sidra import parse_sidra, url_sidra

TABELA_ESTIMATIVAS, VAR_ESTIMATIVAS = 6579, 9324
TABELA_CENSO, VAR_CENSO = 4709, 93
FONTE = "ibge_populacao"
# Estimativas anteriores ao Censo 2022 estão em outra base (o Censo revisou a população de muitos
# municípios) e criariam saltos falsos na série; a série começa no Censo.
ANO_BASE = 2022
TERRITORIO_RS = "n3/43"



def urls() -> dict[str, str]:
    territorio = territorio_sidra()
    return {"estimativas": url_sidra(TABELA_ESTIMATIVAS, [VAR_ESTIMATIVAS], "last 10", territorio=territorio),
            "censo": url_sidra(TABELA_CENSO, [VAR_CENSO], "2022", territorio=territorio),
            "estimativas_rs": url_sidra(TABELA_ESTIMATIVAS, [VAR_ESTIMATIVAS], "last 10", territorio=TERRITORIO_RS),
            "censo_rs": url_sidra(TABELA_CENSO, [VAR_CENSO], "2022", territorio=TERRITORIO_RS)}


def _por_chave(linhas: list[dict]) -> dict[tuple[str, str], float]:
    return {(l["Município (Código)"], l["Ano (Código)"]): l["Valor"] for l in linhas}


def normalizar(linhas_estimativas: list[dict], linhas_censo: list[dict]) -> list[tuple]:
    valores = _por_chave(linhas_estimativas) | _por_chave(linhas_censo)
    return [(cod, "populacao", ano, None, v) for (cod, ano), v in sorted(valores.items())
            if int(ano) >= ANO_BASE]


def normalizar_rs(linhas_estimativas: list[dict], linhas_censo: list[dict]) -> list[tuple]:
    """Referências (indicador, ano, valor) da população do RS; o Censo prevalece em 2022."""
    valores = {l["Ano (Código)"]: l["Valor"] for l in linhas_estimativas + linhas_censo}
    return [("populacao", ano, v) for ano, v in sorted(valores.items()) if int(ano) >= ANO_BASE]


def _caminho(nome: str) -> Path:
    return cache_do_recorte(FONTE) / f"{nome}.json"


def baixar() -> list[Path]:
    return [rede.baixar(url, _caminho(nome)) for nome, url in urls().items()]


def _ler(nome: str) -> list[dict]:
    return parse_sidra(json.loads(_caminho(nome).read_text(encoding="utf-8")))


def carregar(con) -> int:
    n = substituir_fatos(con, FONTE, normalizar(_ler("estimativas"), _ler("censo")))
    referencias = normalizar_rs(_ler("estimativas_rs"), _ler("censo_rs"))
    if referencias:
        con.execute("begin")
        con.execute("delete from referencias where indicador = 'populacao'")
        con.executemany("insert into referencias values (?, ?, ?)", referencias)
        con.execute("commit")
    return n
