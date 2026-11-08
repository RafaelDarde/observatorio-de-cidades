"""Cliente mínimo da API SIDRA do IBGE (apisidra.ibge.gov.br)."""
from urllib.parse import quote

BASE = "https://apisidra.ibge.gov.br/values"
ESPECIAIS = {"-", "..", "...", "X"}


def url_sidra(tabela: int, variaveis: list[int], periodo: str, territorio: str = "n6/all",
              classificacao: str = "") -> str:
    url = f"{BASE}/t/{tabela}/{quote(territorio)}/v/{','.join(map(str, variaveis))}/p/{quote(periodo)}"
    return url + (f"/{quote(classificacao)}" if classificacao else "")


def parse_sidra(linhas: list[dict]) -> list[dict]:
    if not linhas:
        return []
    cabecalho, *dados = linhas
    resultado = []
    for linha in dados:
        if linha.get("V") in ESPECIAIS:
            continue
        item = {cabecalho[k]: v for k, v in linha.items()}
        item[cabecalho["V"]] = float(linha["V"])
        resultado.append(item)
    return resultado
