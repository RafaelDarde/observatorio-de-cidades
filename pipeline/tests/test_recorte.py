from observatorio.recorte import carregar_recorte, territorio_sidra


def test_recorte_padrao_e_o_litoral_do_rs():
    r = carregar_recorte()
    assert r.nome == "Litoral do RS"
    assert len(r.municipios) == 16
    assert r.municipios["4321501"] == "Torres"
    assert r.municipios["4317301"] == "Santa Vitória do Palmar"
    assert all(c.startswith("43") and len(c) == 7 for c in r.municipios)


def test_territorio_sidra_lista_os_codigos(tmp_path):
    arq = tmp_path / "r.yaml"
    arq.write_text("nome: X\ndescricao: Y\nmunicipios:\n  '4321501': Torres\n  '4301057': Arroio do Sal\n",
                   encoding="utf-8")
    assert territorio_sidra(carregar_recorte(arq)) == "n6/4301057,4321501"


def test_cache_das_consultas_separado_por_recorte(tmp_path):
    from observatorio.recorte import Recorte, cache_do_recorte
    a = Recorte("A", "", {"4321501": "Torres"})
    b = Recorte("B", "", {"4321501": "Torres", "4301057": "Arroio do Sal"})
    assert cache_do_recorte("ibge_pib", a) != cache_do_recorte("ibge_pib", b)
    assert cache_do_recorte("ibge_pib", a) == cache_do_recorte("ibge_pib", Recorte("outro nome", "", dict(a.municipios)))
