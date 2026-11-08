import json
from pathlib import Path

from observatorio.fontes.ibge_municipios import parse

DADOS = json.loads((Path(__file__).parent / "fixtures" / "localidades.json").read_text(encoding="utf-8"))


def test_parse_extrai_campos():
    assert ("4314902", "431490", "Porto Alegre", "RS", "Sul") in parse(DADOS)


def test_parse_microrregiao_nula_usa_regiao_imediata():
    assert ("5101837", "510183", "Boa Esperança do Norte", "MT", "Centro-Oeste") in parse(DADOS)


def test_parse_devolve_um_por_municipio():
    assert len(parse(DADOS)) == 3
