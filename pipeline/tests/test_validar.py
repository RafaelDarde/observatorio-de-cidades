import pytest

from observatorio.banco import conectar, substituir_fatos
from observatorio.validar import validar


@pytest.fixture
def con():
    c = conectar(":memory:")
    c.execute("insert into municipios values ('4314902','431490','Porto Alegre','RS','Sul'),"
              "('4300034','430003','Aceguá','RS','Sul')")
    substituir_fatos(c, "ibge_populacao", [("4314902", "populacao", "2025", None, 995.0),
                                           ("4300034", "populacao", "2025", None, 5.0)])
    return c


def test_tudo_ok(con):
    assert validar(con, 2) == []


def test_contagem_de_municipios_diverge(con):
    erros = validar(con, 3)
    assert len(erros) == 1 and "municípios" in erros[0]


def test_chave_duplicada(con):
    con.execute("insert into fatos values ('x','4314902','i','2020',null,1),('x','4314902','i','2020',null,2)")
    erros = validar(con, 2)
    assert len(erros) == 1 and "duplicad" in erros[0]


def test_recortes_diferentes_nao_sao_duplicata(con):
    con.execute("insert into fatos values ('x','4314902','i','2020','a',1),('x','4314902','i','2020',null,2)")
    assert validar(con, 2) == []


def test_municipio_sem_populacao(con):
    con.execute("insert into municipios values ('4321501','432150','Torres','RS','Sul')")
    erros = validar(con, 3)
    assert len(erros) == 1 and "Torres" in erros[0]


def test_codigo_de_municipio_desconhecido(con):
    con.execute("insert into fatos values ('x','9999999','i','2020',null,1)")
    erros = validar(con, 2)
    assert len(erros) == 1 and "9999999" in erros[0]
