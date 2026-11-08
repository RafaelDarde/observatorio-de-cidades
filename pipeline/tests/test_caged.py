from pathlib import Path

import pytest

from observatorio.banco import conectar
from observatorio.fontes.caged import LayoutInesperado, agregar, meses_disponiveis, resumir

AMOSTRA = Path(__file__).parent / "fixtures" / "CAGEDMOV_amostra.txt"


@pytest.fixture
def con():
    c = conectar(":memory:")
    c.execute("insert into municipios values ('4314902','431490','Porto Alegre','RS','Sul'),"
              "('4300034','430003','Aceguá','RS','Sul')")
    return c


@pytest.fixture
def resumo(tmp_path):
    return resumir(AMOSTRA, tmp_path / "202608.parquet")


def _valor(tuplas, cod, ind, per, rec=None):
    achados = [t[4] for t in tuplas if t[:4] == (cod, ind, per, rec)]
    assert len(achados) == 1, (cod, ind, per, rec, achados)
    return achados[0]


def test_agregar_total_e_setor(con, resumo):
    tuplas, _ = agregar(con, [resumo])
    assert _valor(tuplas, "4314902", "caged_admissoes", "2026-08") == 3
    assert _valor(tuplas, "4314902", "caged_desligamentos", "2026-08") == 2
    assert _valor(tuplas, "4314902", "caged_saldo", "2026-08") == 1
    assert _valor(tuplas, "4314902", "caged_saldo", "2026-08", "Agropecuária") == 0
    assert _valor(tuplas, "4314902", "caged_saldo", "2026-08", "Indústria") == 1
    assert _valor(tuplas, "4314902", "caged_saldo", "2026-09", "Indústria") == 2
    assert _valor(tuplas, "4314902", "caged_saldo", "2026-09", "Serviços") == 1
    assert _valor(tuplas, "4300034", "caged_desligamentos", "2026-09", "Comércio") == 1
    assert _valor(tuplas, "4300034", "caged_saldo", "2026-09") == -1


def test_municipio_sem_correspondencia_descartado_e_contado(con, resumo):
    tuplas, descartadas = agregar(con, [resumo])
    assert descartadas == 1
    assert {t[0] for t in tuplas} == {"4314902", "4300034"}


def test_layout_diferente_levanta(tmp_path):
    linhas = AMOSTRA.read_text(encoding="utf-8").splitlines()
    sem_coluna = [";".join(l.split(";")[:-1]) for l in linhas]
    ruim = tmp_path / "ruim.txt"
    ruim.write_text("\n".join(sem_coluna), encoding="utf-8")
    with pytest.raises(LayoutInesperado, match="valorsaláriofixo"):
        resumir(ruim, tmp_path / "x.parquet")


def test_meses_disponiveis_ordena():
    arvore = {"": ["2025", "Legado", "Leia-me.txt"], "2025": ["202512", "202511"]}
    assert meses_disponiveis(lambda caminho: arvore[caminho]) == ["2025-11", "2025-12"]
