import json
from types import SimpleNamespace
from urllib.error import URLError

import pytest

from observatorio import cli
from observatorio.banco import conectar, substituir_fatos


class FonteFalsa:
    def __init__(self, nome, linhas=(), falha=False):
        self.nome, self.linhas, self.falha, self.chamadas = nome, list(linhas), falha, []

    def baixar(self):
        self.chamadas.append("baixar")
        if self.falha:
            raise URLError("fora do ar")
        return []

    def carregar(self, con):
        self.chamadas.append("carregar")
        return substituir_fatos(con, self.nome, self.linhas)


def _municipios_falsa():
    f = FonteFalsa("ibge_municipios")

    def carregar(con):
        f.chamadas.append("carregar")
        con.execute("delete from municipios")
        con.execute("insert into municipios values ('4314902','431490','Porto Alegre','RS','Sul')")
        return 1

    f.carregar = carregar
    f.total_api = lambda: 1
    return f


@pytest.fixture
def ambiente(tmp_path, monkeypatch):
    saida = tmp_path / "dados"
    monkeypatch.setattr(cli, "SAIDA_DIR", saida)
    con = conectar(":memory:")
    return con, saida


def test_fonte_que_falha_nao_impede_as_outras(ambiente):
    con, saida = ambiente
    substituir_fatos(con, "pib", [("4314902", "pib", "2020", None, 7.0)])  # carga anterior
    fontes = {"ibge_municipios": _municipios_falsa(),
              "pib": FonteFalsa("pib", falha=True),
              "pop": FonteFalsa("pop", [("4314902", "populacao", "2025", None, 10.0)])}
    assert cli.atualizar(con, fontes) == 0
    assert fontes["pop"].chamadas == ["baixar", "carregar"]
    assert con.execute("select valor from fatos where fonte='pib'").fetchone()[0] == 7.0
    perfil = json.loads((saida / "municipios" / "4314902.json").read_text(encoding="utf-8"))
    assert perfil["indicadores"]["pib"]["ultimo"]["valor"] == 7.0


def test_validacao_falha_retorna_1_sem_exportar(ambiente):
    con, saida = ambiente
    m = _municipios_falsa()
    m.total_api = lambda: 999
    assert cli.atualizar(con, {"ibge_municipios": m}) == 1
    assert not saida.exists()


def test_so_roda_fonte_pedida(ambiente):
    con, _ = ambiente
    fontes = {"ibge_municipios": _municipios_falsa(), "pop": FonteFalsa("pop")}
    cli.atualizar(con, fontes, so="pop")
    assert fontes["ibge_municipios"].chamadas == [] and fontes["pop"].chamadas == ["baixar", "carregar"]


def test_fonte_inexistente_retorna_2(ambiente):
    con, _ = ambiente
    assert cli.atualizar(con, {"ibge_municipios": _municipios_falsa()}, so="xyz") == 2


def test_sem_municipios_para_cedo_com_erro_claro(ambiente):
    con, saida = ambiente
    m = _municipios_falsa()
    m.baixar = lambda: (_ for _ in ()).throw(URLError("fora do ar"))
    pop = FonteFalsa("pop", [("4314902", "populacao", "2025", None, 10.0)])
    assert cli.atualizar(con, {"ibge_municipios": m, "pop": pop}) == 1
    assert pop.chamadas == [] and not saida.exists()
