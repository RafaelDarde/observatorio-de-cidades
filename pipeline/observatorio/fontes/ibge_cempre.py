"""CEMPRE: totais por município (SIDRA 9509) e quebra por seção CNAE (SIDRA 9510).

A 9510 só traz dados para parte dos municípios; os totais vêm sempre da 9509.
"""
import json
from pathlib import Path

from observatorio import rede
from observatorio.banco import substituir_fatos
from observatorio.config import cache_do_dia
from observatorio.sidra import parse_sidra, url_sidra

TABELA_TOTAIS, TABELA_SECOES = 9509, 9510
CLASSIFICACAO_CNAE = 12762
FONTE = "ibge_cempre"
VARIAVEIS: dict[int, str] = {
    706: "cempre_unidades_locais",
    707: "cempre_pessoal_ocupado",
    1606: "cempre_salario_medio_sm",
}
# Categorias da classificação 12762 que são seções (A–U); o "Total" (117897) vem da 9509.
SECOES = [116830, 116880, 116910, 117296, 117307, 117329, 117363, 117484, 117543, 117555, 117608,
          117666, 117673, 117714, 117774, 117788, 117810, 117838, 117861, 117888, 117892]
UFS = ["11", "12", "13", "14", "15", "16", "17", "21", "22", "23", "24", "25", "26", "27", "28", "29",
       "31", "32", "33", "35", "41", "42", "43", "50", "51", "52", "53"]
_CNAE = "Classificação Nacional de Atividades Econômicas (CNAE 2.0)"


def normalizar(linhas_totais: list[dict], linhas_secoes: list[dict]) -> list[tuple]:
    resultado = []
    for l in linhas_totais:
        ind = VARIAVEIS.get(int(l["Variável (Código)"]))
        if ind:
            resultado.append((l["Município (Código)"], ind, l["Ano (Código)"], None, l["Valor"]))
    for l in linhas_secoes:
        ind = VARIAVEIS.get(int(l["Variável (Código)"]))
        if ind and l[_CNAE] != "Total":
            resultado.append((l["Município (Código)"], ind, l["Ano (Código)"], l[_CNAE], l["Valor"]))
    return resultado


def _dir() -> Path:
    return cache_do_dia(FONTE)


def baixar() -> list[Path]:
    arquivos = [rede.baixar(url_sidra(TABELA_TOTAIS, list(VARIAVEIS), "last 3"), _dir() / "totais.json")]
    classif = f"c{CLASSIFICACAO_CNAE}/{','.join(map(str, SECOES))}"
    for uf in UFS:
        url = url_sidra(TABELA_SECOES, list(VARIAVEIS), "last 1", territorio=f"n6/in n3 {uf}",
                        classificacao=classif)
        arquivos.append(rede.baixar(url, _dir() / f"secoes_{uf}.json"))
    return arquivos


def _ler(caminho: Path) -> list[dict]:
    return parse_sidra(json.loads(caminho.read_text(encoding="utf-8")))


def carregar(con) -> int:
    secoes = [l for uf in UFS for l in _ler(_dir() / f"secoes_{uf}.json")]
    return substituir_fatos(con, FONTE, normalizar(_ler(_dir() / "totais.json"), secoes))
