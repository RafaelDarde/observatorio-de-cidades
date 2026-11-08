import json
from pathlib import Path

from observatorio.fontes.ibge_pib import normalizar
from observatorio.sidra import parse_sidra

LINHAS = parse_sidra(json.loads((Path(__file__).parent / "fixtures" / "sidra_5938.json").read_text(encoding="utf-8")))


def test_normalizar_mapeia_variaveis():
    r = normalizar(LINHAS)
    indicadores = {t[1] for t in r}
    assert indicadores == {"pib", "vab_agro", "vab_industria", "vab_servicos", "vab_adm_publica"}
    assert len(r) == 6  # VAB de 2023 vem "..." (não publicado) e é descartado
    assert all(t[0] == "4314902" and t[3] is None and t[2] in {"2021", "2023"} for t in r)


def test_variavel_desconhecida_ignorada():
    linhas = [{"Município (Código)": "4314902", "Ano (Código)": "2023", "Variável (Código)": "496", "Valor": 1.0}]
    assert normalizar(linhas) == []


def test_uma_requisicao_por_variavel_para_respeitar_limite_do_sidra():
    from observatorio.fontes.ibge_pib import VARIAVEIS, urls
    u = urls()
    assert set(u) == {f"pib_{v}" for v in VARIAVEIS}
    assert "/t/5938/n6/4301057%2C" in u["pib_37"] and u["pib_37"].endswith("/v/37/p/last%205")
