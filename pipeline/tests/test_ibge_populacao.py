import json
from pathlib import Path

from observatorio.fontes.ibge_populacao import normalizar
from observatorio.sidra import parse_sidra

FIX = Path(__file__).parent / "fixtures"
EST = parse_sidra(json.loads((FIX / "sidra_6579.json").read_text(encoding="utf-8")))
CENSO = parse_sidra(json.loads((FIX / "sidra_4709.json").read_text(encoding="utf-8")))


def test_normalizar_gera_tuplas():
    assert ("4314902", "populacao", "2024", None, 1389322.0) in normalizar(EST, [])


def test_normalizar_censo_prevalece():
    est_2022 = [{"Município (Código)": "4314902", "Ano (Código)": "2022", "Valor": 1.0}]
    r = normalizar(est_2022, CENSO)
    poa_2022 = [t for t in r if t[0] == "4314902" and t[2] == "2022"]
    assert len(poa_2022) == 1 and poa_2022[0][4] == 1332845.0


def test_estimativas_anteriores_ao_censo_2022_descartadas():
    antigas = [{"Município (Código)": "4314902", "Ano (Código)": "2021", "Valor": 1492530.0}]
    assert normalizar(antigas, []) == []


def test_consultas_do_recorte_e_do_rs_sem_total_brasil():
    from observatorio.fontes.ibge_populacao import urls
    u = urls()
    assert set(u) == {"estimativas", "censo", "estimativas_rs", "censo_rs"}
    assert "/n6/4301057%2C" in u["estimativas"] and "/n6/4301057%2C" in u["censo"]
    assert "/n3/43/" in u["estimativas_rs"] and "/n3/43/" in u["censo_rs"]


def test_normalizar_rs_censo_prevalece_e_descarta_anteriores():
    from observatorio.fontes.ibge_populacao import normalizar_rs
    est = [{"Ano (Código)": "2021", "Valor": 1.0}, {"Ano (Código)": "2022", "Valor": 2.0},
           {"Ano (Código)": "2025", "Valor": 11000000.0}]
    censo = [{"Ano (Código)": "2022", "Valor": 10882965.0}]
    assert normalizar_rs(est, censo) == [("populacao", "2022", 10882965.0), ("populacao", "2025", 11000000.0)]
