import pytest

from observatorio.catalogo import carregar_catalogo

COM_RANKING = {
    "populacao", "populacao_var_censo", "pib", "pib_per_capita", "cempre_pessoal_ocupado",
    "cempre_salario_medio_sm", "caged_saldo_12m", "caged_saldo_12m_por_mil_hab",
}


def test_catalogo_real_valido():
    cat = carregar_catalogo()
    assert len(cat) == 16
    assert {i for i, ind in cat.items() if ind.ranking} == COM_RANKING
    assert all(ind.motivo_ausencia.strip() for ind in cat.values())
    assert list(cat)[0] == "populacao"


def _yaml(tmp_path, texto):
    p = tmp_path / "c.yaml"
    p.write_text(texto, encoding="utf-8")
    return p


ITEM = """
- id: {id}
  nome: X
  unidade: {unidade}
  fonte: f
  descricao: d
  tema: populacao
  relativo: false
  ranking: false
  motivo_ausencia: m
"""


def test_id_duplicado_falha(tmp_path):
    p = _yaml(tmp_path, ITEM.format(id="a", unidade="pessoas") + ITEM.format(id="a", unidade="pessoas"))
    with pytest.raises(ValueError, match="duplicado"):
        carregar_catalogo(p)


def test_unidade_invalida_falha(tmp_path):
    p = _yaml(tmp_path, ITEM.format(id="a", unidade="metros"))
    with pytest.raises(ValueError, match="unidade"):
        carregar_catalogo(p)
