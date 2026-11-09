import math

import pytest

from observatorio.banco import conectar, substituir_fatos
from observatorio.seguranca import PESOS, SUAVIZACAO, _meses_anteriores, nota, nota_dimensao, notas_seguranca

CID, GDE = "4305454", "4315602"
MESES = [f"2025-{m:02d}" for m in range(1, 13)] + [f"2026-{m:02d}" for m in range(1, 4)]
# RS: 1 milhão de habitantes; por mês 1 morte violenta, 1 estupro, 10 roubos e 100 furtos por 100 mil.
RS_MES = {"seg_cvli": 10.0, "seg_estupro": 10.0, "seg_roubos": 100.0, "seg_furtos": 1000.0}


def _con(municipios: dict[str, tuple[float, dict]]) -> object:
    """municipios: cod -> (população, {dimensão: função(mês AAAA-MM) -> ocorrências})."""
    c = conectar(":memory:")
    c.executemany("insert into referencias values (?, ?, ?)",
                  [("populacao", a, 1_000_000.0) for a in ("2025", "2026")]
                  + [(f"{d}_mes", m, v) for d, v in RS_MES.items() for m in MESES])
    substituir_fatos(c, "ibge_populacao", [(cod, "populacao", a, None, p)
                                           for cod, (p, _) in municipios.items() for a in ("2025", "2026")])
    substituir_fatos(c, "ssp_rs", [(cod, f"{d}_mes", m, None, f(m))
                                   for cod, (_, fs) in municipios.items() for d, f in fs.items() for m in MESES])
    return c


def _media_rs(pop):
    return {d: (lambda m, v=v * pop / 1_000_000: v) for d, v in RS_MES.items()}


def test_meses_anteriores_atravessa_o_ano():
    assert _meses_anteriores("2026-03")[:2] == ["2025-04", "2025-05"] and _meses_anteriores("2026-03")[-1] == "2026-03"


def test_cidade_na_media_do_rs_tira_50():
    c = _con({GDE: (200_000.0, _media_rs(200_000))})
    serie = {l[2]: l[4] for l in notas_seguranca(c) if l[0] == GDE and l[1] == "seg_nota" and l[3] is None}
    assert list(serie) == ["2025-12", "2026-01", "2026-02", "2026-03"]  # uma nota por janela de 12 meses
    assert all(v == pytest.approx(50.0) for v in serie.values())


def test_dobro_do_rs_em_tudo_tira_zero_e_metade_tira_100():
    assert nota({d: 1.0 for d in PESOS}) == 0.0
    assert nota({d: -1.0 for d in PESOS}) == 100.0


def test_limite_de_4x_impede_que_uma_dimensao_domine():
    assert nota_dimensao(1_000_000, 100_000, 1e-5) == 2.0
    assert nota_dimensao(0, 10_000_000, 1e-3) == -2.0


def test_suavizacao_puxa_cidade_pequena_para_a_media():
    # 1 morte em 5 mil habitantes: taxa bruta 2x a do RS (10 por 100 mil); suavizada fica bem mais perto.
    bruto = math.log2((1 / 5000) / 1e-4)
    suavizado = nota_dimensao(1, 5000, 1e-4)
    assert bruto == pytest.approx(1.0) and 0 < suavizado < 0.3
    assert SUAVIZACAO == 3


def test_veraneio_desconta_so_o_excesso_de_verao_da_cidade():
    # Cidade na média do RS fora do verão e com o triplo de roubos e furtos no verão.
    base = _media_rs(20_000)
    verao = {d: (lambda m, f=f, d=d: f(m) * (3 if int(m[5:]) in {12, 1, 2, 3} and d in ("seg_roubos", "seg_furtos")
                                              else 1)) for d, f in base.items()}
    c = _con({CID: (20_000.0, verao)})
    linhas = [l for l in notas_seguranca(c) if l[0] == CID and l[2] == "2026-03" and l[3] is None]
    notas = {l[1]: l[4] for l in linhas}
    assert notas["seg_nota"] < 45
    assert notas["seg_nota_veraneio"] == pytest.approx(50.0)


def test_veraneio_nao_piora_cidade_com_verao_calmo():
    base = _media_rs(200_000)
    calmo = {d: (lambda m, f=f: f(m) * (0.5 if int(m[5:]) in {12, 1, 2, 3} else 1)) for d, f in base.items()}
    c = _con({GDE: (200_000.0, calmo)})
    notas = {l[1]: l[4] for l in notas_seguranca(c) if l[2] == "2026-03" and l[3] is None}
    assert notas["seg_nota_veraneio"] == pytest.approx(notas["seg_nota"])


def test_composicao_por_dimensao_so_no_ultimo_mes():
    c = _con({GDE: (200_000.0, _media_rs(200_000))})
    recortes = [l for l in notas_seguranca(c) if l[3] is not None]
    assert {l[2] for l in recortes} == {"2026-03"}
    assert {l[3] for l in recortes} == {"Mortes violentas", "Estupro", "Roubos", "Furtos"}


def test_sem_dados_de_seguranca_nao_gera_nota():
    assert notas_seguranca(conectar(":memory:")) == []
