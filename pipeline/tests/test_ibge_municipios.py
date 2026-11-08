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


def test_total_api_usa_cache_mais_recente_mesmo_de_outro_dia(tmp_path, monkeypatch):
    from observatorio.fontes import ibge_municipios
    monkeypatch.setattr(ibge_municipios, "CACHE_FONTE", tmp_path)
    for dia, n in [("2026-11-01", 2), ("2026-11-05", 3)]:
        (tmp_path / dia).mkdir()
        (tmp_path / dia / "municipios.json").write_text(json.dumps(DADOS[:n]), encoding="utf-8")
    assert ibge_municipios.total_api() == 3


def test_total_api_sem_cache_da_erro_claro(tmp_path, monkeypatch):
    import pytest
    from observatorio.fontes import ibge_municipios
    monkeypatch.setattr(ibge_municipios, "CACHE_FONTE", tmp_path)
    with pytest.raises(FileNotFoundError, match="municípios"):
        ibge_municipios.total_api()
