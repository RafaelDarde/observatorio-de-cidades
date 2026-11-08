import pytest

from observatorio.banco import CargaSuspeita, conectar, substituir_fatos


def test_conectar_cria_tabelas():
    con = conectar(":memory:")
    nomes = {r[0] for r in con.execute("select table_name from information_schema.tables").fetchall()}
    assert {"municipios", "fatos", "cargas", "referencias"} <= nomes


def test_substituir_fatos_troca_so_a_fonte_e_registra_carga():
    con = conectar(":memory:")
    substituir_fatos(con, "a", [("4314902", "x", "2020", None, 1.0)])
    substituir_fatos(con, "b", [("4314902", "y", "2021", None, 2.0)])
    n = substituir_fatos(con, "a", [("4314902", "x", "2022", None, 3.0), ("4314902", "x", "2023", None, 4.0)])
    assert n == 2
    assert con.execute("select count(*) from fatos where fonte='a'").fetchone()[0] == 2
    assert con.execute("select count(*) from fatos where fonte='b'").fetchone()[0] == 1
    assert con.execute("select periodo_min, periodo_max, linhas from cargas where fonte='a'").fetchone() == ("2022", "2023", 2)


def test_substituir_fatos_volume_grande_rapido():
    import time
    con = conectar(":memory:")
    linhas = [(f"{i:07d}", "x", "2020", None if i % 2 else "r", float(i)) for i in range(200_000)]
    t = time.perf_counter()
    assert substituir_fatos(con, "a", linhas) == 200_000
    assert time.perf_counter() - t < 10
    assert con.execute("select count(*) from fatos where recorte is null").fetchone()[0] == 100_000


def test_carga_vazia_nao_apaga_a_anterior():
    con = conectar(":memory:")
    substituir_fatos(con, "a", [("4314902", "x", "2020", None, 1.0)])
    with pytest.raises(CargaSuspeita):
        substituir_fatos(con, "a", [])
    assert con.execute("select count(*) from fatos where fonte='a'").fetchone()[0] == 1


def test_carga_com_menos_da_metade_das_linhas_e_recusada():
    con = conectar(":memory:")
    substituir_fatos(con, "a", [(f"{i:07d}", "x", "2020", None, 1.0) for i in range(10)])
    with pytest.raises(CargaSuspeita):
        substituir_fatos(con, "a", [(f"{i:07d}", "x", "2020", None, 1.0) for i in range(4)])
    assert substituir_fatos(con, "a", [(f"{i:07d}", "x", "2020", None, 1.0) for i in range(6)]) == 6
