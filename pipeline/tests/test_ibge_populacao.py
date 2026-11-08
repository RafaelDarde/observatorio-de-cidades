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
