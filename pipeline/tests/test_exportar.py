import dataclasses
import json

import jsonschema
import pytest

from observatorio.banco import conectar, substituir_fatos
from observatorio.catalogo import carregar_catalogo
from observatorio.config import SCHEMA_PATH
from observatorio.exportar import exportar, montar_perfis, montar_ranking

POA, ACE, FLO = "4314902", "4300034", "4205407"
SETOR = "A Agricultura"


@pytest.fixture
def con():
    c = conectar(":memory:")
    c.execute(f"insert into municipios values ('{POA}','431490','Porto Alegre','RS','Sul'),"
              f"('{ACE}','430003','Aceguá','RS','Sul'),('{FLO}','420540','Florianópolis','SC','Sul')")
    substituir_fatos(c, "ibge_populacao", [
        (POA, "populacao", "2024", None, 1000.0), (POA, "populacao", "2025", None, 1100.0),
        (ACE, "populacao", "2024", None, 50.0), (FLO, "populacao", "2025", None, 600.0)])
    substituir_fatos(c, "ibge_cempre", [
        (POA, "cempre_pessoal_ocupado", "2024", None, 500.0),
        (POA, "cempre_pessoal_ocupado", "2024", SETOR, 100.0),
        (POA, "cempre_pessoal_ocupado", "2023", SETOR, 90.0)])
    substituir_fatos(c, "ibge_pib", [(POA, "pib", "2023", None, 123.456789)])
    return c


@pytest.fixture
def catalogo():
    return carregar_catalogo()


def _validar(objeto, definicao):
    schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
    jsonschema.validate(objeto, {"$defs": schema["$defs"], "$ref": f"#/$defs/{definicao}"})


def test_perfil_valido_no_schema_e_com_todos_os_indicadores(con, catalogo):
    perfis = montar_perfis(con, catalogo)
    assert set(perfis) == {POA, ACE, FLO}
    for p in perfis.values():
        _validar(p, "perfil")
        assert list(p["indicadores"]) == list(catalogo)
    assert perfis[POA]["nome"] == "Porto Alegre" and perfis[POA]["uf"] == "RS"


def test_indicador_sem_linhas_e_null(con, catalogo):
    assert montar_perfis(con, catalogo)[ACE]["indicadores"]["pib"] is None


def test_sem_valor_no_ultimo_periodo_ultimo_null_serie_mantida(con, catalogo):
    ind = montar_perfis(con, catalogo)[ACE]["indicadores"]["populacao"]
    assert ind["serie"] == [{"periodo": "2024", "valor": 50.0}]
    assert ind["ultimo"] is None and ind["posicao"] is None


def test_posicao_dentro_do_recorte_com_total(con, catalogo):
    perfis = montar_perfis(con, catalogo)
    assert perfis[POA]["indicadores"]["populacao"]["posicao"] == {"posicao": 1, "total": 2}
    assert perfis[FLO]["indicadores"]["populacao"]["posicao"] == {"posicao": 2, "total": 2}
    assert perfis[POA]["indicadores"]["populacao"]["ultimo"] == {"periodo": "2025", "valor": 1100.0}


def test_sem_ranking_no_catalogo_posicao_null(con, catalogo):
    con.execute(f"insert into fatos values ('x','{POA}','vab_agro','2021',null,1.0)")
    assert montar_perfis(con, catalogo)[POA]["indicadores"]["vab_agro"]["posicao"] is None


def test_por_recorte_do_ultimo_periodo(con, catalogo):
    perfis = montar_perfis(con, catalogo)
    assert perfis[POA]["indicadores"]["cempre_pessoal_ocupado"]["por_recorte"] == [{"recorte": SETOR, "valor": 100.0}]
    assert "por_recorte" not in perfis[POA]["indicadores"]["populacao"]


def test_valores_arredondados_em_2_casas(con, catalogo):
    assert montar_perfis(con, catalogo)[POA]["indicadores"]["pib"]["ultimo"]["valor"] == 123.46


def test_ranking_ordenado_sem_municipio_ausente(con):
    r = montar_ranking(con, "populacao")
    _validar(r, "ranking")
    assert [(i["cod"], i["posicao"]) for i in r] == [(POA, 1), (FLO, 2)]


def test_exportar_grava_arquivos_validos(con, catalogo, tmp_path):
    saida = tmp_path / "dados"
    exportar(con, catalogo, saida)
    _validar(json.loads((saida / "catalogo.json").read_text(encoding="utf-8")), "catalogo")
    _validar(json.loads((saida / "municipios.json").read_text(encoding="utf-8")), "indiceMunicipios")
    _validar(json.loads((saida / "meta.json").read_text(encoding="utf-8")), "meta")
    assert (saida / "municipios" / f"{POA}.json").exists()
    assert sorted(p.stem for p in (saida / "rankings").iterdir()) == sorted(i for i, c in catalogo.items() if c.ranking)
    cat = json.loads((saida / "catalogo.json").read_text(encoding="utf-8"))
    pop = next(i for i in cat if i["id"] == "populacao")
    assert (pop["periodo_min"], pop["periodo_max"]) == ("2024", "2025")


def test_falha_de_schema_nao_altera_saida(con, catalogo, tmp_path):
    saida = tmp_path / "dados"
    saida.mkdir()
    (saida / "antigo.json").write_text("{}", encoding="utf-8")
    ruim = dict(catalogo)
    ruim["populacao"] = dataclasses.replace(catalogo["populacao"], unidade="metros")
    with pytest.raises(jsonschema.ValidationError):
        exportar(con, ruim, saida)
    assert [p.name for p in saida.iterdir()] == ["antigo.json"]


def test_falha_na_troca_restaura_saida_anterior(con, catalogo, tmp_path, monkeypatch):
    import pathlib
    saida = tmp_path / "dados"
    saida.mkdir()
    (saida / "antigo.json").write_text("{}", encoding="utf-8")
    original = pathlib.Path.rename

    def rename(self, alvo):
        if self.name == "dados.novo":
            raise PermissionError("arquivo em uso")
        return original(self, alvo)

    monkeypatch.setattr(pathlib.Path, "rename", rename)
    with pytest.raises(PermissionError):
        exportar(con, catalogo, saida)
    assert [p.name for p in saida.iterdir()] == ["antigo.json"]


def test_sobra_de_antigo_de_execucao_anterior_nao_impede_exportar(con, catalogo, tmp_path):
    saida = tmp_path / "dados"
    (tmp_path / "dados.antigo").mkdir()
    (tmp_path / "dados.antigo" / "lixo.json").write_text("{}", encoding="utf-8")
    exportar(con, catalogo, saida)
    assert (saida / "catalogo.json").exists() and not (tmp_path / "dados.antigo").exists()
