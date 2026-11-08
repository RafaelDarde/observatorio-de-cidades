import json
from pathlib import Path

from observatorio.fontes.ibge_cempre import normalizar
from observatorio.sidra import parse_sidra

FIX = Path(__file__).parent / "fixtures"
TOTAIS = parse_sidra(json.loads((FIX / "sidra_9509.json").read_text(encoding="utf-8")))
SECOES = parse_sidra(json.loads((FIX / "sidra_9510.json").read_text(encoding="utf-8")))
CNAE = "Classificação Nacional de Atividades Econômicas (CNAE 2.0)"


def test_totais_vem_da_9509_com_recorte_nulo_e_serie():
    r = normalizar(TOTAIS, [])
    assert ("4314902", "cempre_pessoal_ocupado", "2024", None, 892726.0) in r
    assert ("4300034", "cempre_unidades_locais", "2023", None, 276.0) in r
    assert ("4300034", "cempre_salario_medio_sm", "2024", None, 2.7) in r
    assert len(r) == 12


def test_secao_vira_recorte_e_total_da_9510_e_ignorado():
    r = normalizar([], SECOES)
    assert ("4314902", "cempre_pessoal_ocupado", "2024", "A Agricultura, pecuária, produção florestal, pesca e aquicultura", 1823.0) in r
    assert all(t[3] is not None for t in r)
    assert all(t[0] == "4314902" for t in r)  # Aceguá vem "..." na 9510 e é descartado
    assert len(r) == 6


def test_sigilo_descartado():
    linhas = parse_sidra([
        json.loads((FIX / "sidra_9510.json").read_text(encoding="utf-8"))[0],
        {"D1C": "4314902", "D2C": "707", "D3C": "2024", "D4C": "116880", "D4N": "B Indústrias extrativas", "V": "X"},
    ])
    assert normalizar([], linhas) == []
