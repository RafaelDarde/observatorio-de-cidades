from observatorio.sidra import parse_sidra, url_sidra

LINHAS = [
    {"D1C": "Município (Código)", "D2C": "Ano", "D3C": "Variável (Código)", "V": "Valor"},
    {"D1C": "4314902", "D2C": "2024", "D3C": "9324", "V": "1389322"},
    {"D1C": "4300034", "D2C": "2024", "D3C": "9324", "V": "X"},
    {"D1C": "4300059", "D2C": "2024", "D3C": "9324", "V": "..."},
    {"D1C": "4300109", "D2C": "2024", "D3C": "9324", "V": "-"},
    {"D1C": "4300208", "D2C": "2024", "D3C": "9324", "V": ".."},
]


def test_parse_descarta_especiais_nunca_zero():
    r = parse_sidra(LINHAS)
    assert r == [{"Município (Código)": "4314902", "Ano": "2024", "Variável (Código)": "9324", "Valor": 1389322.0}]


def test_parse_valor_decimal():
    linhas = [LINHAS[0], {"D1C": "4314902", "D2C": "2021", "D3C": "37", "V": "52.37"}]
    assert parse_sidra(linhas)[0]["Valor"] == 52.37


def test_url_sidra():
    assert url_sidra(5938, [37, 497], "last 5") == "https://apisidra.ibge.gov.br/values/t/5938/n6/all/v/37,497/p/last%205"


def test_url_sidra_territorio_e_classificacao():
    assert url_sidra(1685, [1], "2022", territorio="n6/in n3 43", classificacao="c12762/all") == (
        "https://apisidra.ibge.gov.br/values/t/1685/n6/in%20n3%2043/v/1/p/2022/c12762/all"
    )
