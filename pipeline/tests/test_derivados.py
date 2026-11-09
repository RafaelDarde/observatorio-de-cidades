import pytest

from observatorio.banco import conectar, substituir_fatos
from observatorio.derivados import calcular_derivados

POA, ACE = "4314902", "4300034"


@pytest.fixture
def con():
    c = conectar(":memory:")
    substituir_fatos(c, "ibge_populacao", [
        (POA, "populacao", "2020", None, 1000.0), (POA, "populacao", "2025", None, 1100.0),
        (ACE, "populacao", "2025", None, 500.0), (POA, "populacao", "2022", None, 1040.0), (POA, "populacao", "2024", None, 1060.0),
    ])
    meses = [f"2025-{m:02d}" for m in range(1, 13)] + ["2026-01", "2026-02"]
    caged = [(POA, "caged_saldo", m, None, 10.0) for m in meses]
    caged += [(POA, "caged_saldo", "2026-02", "Comércio", 999.0)]
    caged += [(ACE, "caged_saldo", m, None, -1.0) for m in meses[-5:]]
    substituir_fatos(c, "caged", caged)
    substituir_fatos(c, "ibge_pib", [(POA, "pib", "2025", None, 55000.0), (POA, "pib", "2023", None, 52500.0), (POA, "pib", "2019", None, 1.0)])
    calcular_derivados(c)
    return c


def _v(con, cod, ind):
    r = con.execute("select periodo, valor from fatos where fonte='derivado' and cod_municipio=? and indicador=?",
                    [cod, ind]).fetchall()
    return r


def test_var_desde_censo(con):
    assert _v(con, POA, "populacao_var_censo") == [("2025", pytest.approx((1100 / 1040 - 1) * 100))]


def test_var_desde_censo_sem_ano_base_omite(con):
    assert _v(con, ACE, "populacao_var_censo") == []


def test_saldo_12m_soma_12_meses(con):
    assert _v(con, POA, "caged_saldo_12m") == [("2026-02", 120.0)]
    # mês sem linha no CAGED = nenhuma movimentação (zero), não dado ausente
    assert _v(con, ACE, "caged_saldo_12m") == [("2026-02", -5.0)]


def test_saldo_por_mil(con):
    assert _v(con, POA, "caged_saldo_12m_por_mil_hab") == [("2026-02", pytest.approx(120 / 1100 * 1000))]


def test_pib_per_capita_mesmo_ano_e_ano_sem_estimativa_interpolado(con):
    # 2019: sem população nem vizinhos -> omitido; 2023: sem estimativa -> média de 2022 e 2024
    assert sorted(_v(con, POA, "pib_per_capita")) == [
        ("2023", pytest.approx(52500 * 1000 / 1050)), ("2025", pytest.approx(55000 * 1000 / 1100))]


@pytest.fixture
def con_seg():
    c = conectar(":memory:")
    # População sem 2023: usa a média de 2022 e 2024.
    substituir_fatos(c, "ibge_populacao", [
        (POA, "populacao", "2022", None, 100000.0), (POA, "populacao", "2024", None, 100000.0),
        (POA, "populacao", "2025", None, 100000.0),
        (ACE, "populacao", "2022", None, 10000.0), (ACE, "populacao", "2024", None, 10000.0),
        (ACE, "populacao", "2025", None, 10000.0),
    ])
    seg = []
    for ano in ("2022", "2023", "2024", "2025"):
        seg += [(POA, "seg_cvli", ano, None, 20.0), (POA, "seg_roubos", ano, None, 200.0),
                (POA, "seg_furtos", ano, None, 1000.0)]
        seg += [(ACE, "seg_cvli", ano, None, 1.0), (ACE, "seg_roubos", ano, None, 10.0),
                (ACE, "seg_furtos", ano, None, 100.0)]
    substituir_fatos(c, "ssp_rs", seg)
    # RS: 1 milhão de habitantes; taxas de 10 (CVLI), 100 (roubos) e 1000 (furtos) por 100 mil.
    refs = [("populacao", a, 1_000_000.0) for a in ("2022", "2024", "2025")]
    for ano in ("2022", "2023", "2024", "2025"):
        refs += [("seg_cvli", ano, 100.0), ("seg_roubos", ano, 1000.0), ("seg_furtos", ano, 10000.0)]
    c.executemany("insert into referencias values (?, ?, ?)", refs)
    calcular_derivados(c)
    return c


def test_taxa_por_100_mil_com_populacao_interpolada(con_seg):
    assert ("2023", pytest.approx(20.0)) in _v(con_seg, POA, "seg_taxa_cvli")
    assert len(_v(con_seg, POA, "seg_taxa_furtos")) == 4


def test_indice_100_igual_ao_rs_e_pondera_mortes_violentas(con_seg):
    # POA: CVLI 20 (2x RS), roubos 200 (2x), furtos 1000 (1x) -> 100 * (0,5*2 + 0,25*2 + 0,25*1) = 175
    assert _v(con_seg, POA, "seg_indice_violencia") == [("2025", pytest.approx(175.0))]
    # ACE: CVLI 10 (1x), roubos 100 (1x), furtos 1000 (1x) -> 100
    assert _v(con_seg, ACE, "seg_indice_violencia") == [("2025", pytest.approx(100.0))]


def test_sem_dados_de_seguranca_nao_gera_indice(con):
    assert _v(con, POA, "seg_indice_violencia") == []
