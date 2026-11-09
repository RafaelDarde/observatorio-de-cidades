import openpyxl
import pytest

from observatorio.fontes.ssp_rs import (LayoutInesperado, ler_crimes, ler_estupro, links_anuais, normalizar,
                                        normalizar_nome)

CABECALHO = [" Municípios", " Homicídio  Doloso", "Total de vítimas de Homicidio Doloso", " Latrocínio", " Furtos",
             "Abigeato*", "Furto de Veículo ", " Roubos", " Roubo de Veículo", "Total de Vítimas de CVLI*"]
MESES = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"]
NOMES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro",
         "novembro", "dezembro"]
LINHAS = [
    ["TRAMANDAI", 1, 1, 0, 90, 1, 5, 8, 1, 2],
    ["XANGRI-LA", 0, 0, 0, 20, 0, 1, 2, 0, 0],
    ["PORTO ALEGRE", 30, 32, 1, 4000, 0, 90, 900, 80, 35],
    ["Total RS", 31, 33, 1, 4110, 1, 96, 910, 81, 37],
    ["Fonte: PROCERGS/OESP"],
]


def _crimes(pasta, ano=2025, meses_com_dados=12, cabecalho=CABECALHO):
    wb = openpyxl.Workbook()
    wb.active.title = "GERAL"
    wb.create_sheet(str(ano)).append(["totais do ano"])
    for i, sigla in enumerate(MESES):
        ws = wb.create_sheet(sigla)
        cheio = i < meses_com_dados
        # Meses futuros: a SSP deixa a aba com título de outro ano e sem valores.
        ws.append([f"Indicadores Criminais por município:  {NOMES[i]} de {ano if cheio else ano - 1} - Fato Consumado"])
        ws.append([])
        ws.append(cabecalho)
        for linha in LINHAS if cheio else [["Total RS"]]:
            ws.append(linha)
    arquivo = pasta / f"crimes-{ano}.xlsx"
    wb.save(arquivo)
    return arquivo


def _estupro(pasta, ano=2025, meses_com_dados=12):
    wb = openpyxl.Workbook()
    wb.active.title = "Geral"
    ws = wb.create_sheet("Estupro")
    ws.append([None, f"Monitoramento do Indicador de Estupro nos Municípios do Estado do Rio Grande do Sul no Ano de {ano}"])
    ws.append([None, "Município", "Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez", "Total"])
    for nome, v in (("TRAMANDAI", 2), ("XANGRI-LA", 0), ("PORTO ALEGRE", 50)):
        ws.append([None, nome] + [v if i < meses_com_dados else "" for i in range(12)] + [v * meses_com_dados])
    ws.append([None, "Geral"] + [52] * 12 + [624])
    arquivo = pasta / f"mulher-{ano}.xlsx"
    wb.save(arquivo)
    return arquivo


MUNICIPIOS = {"4321600": "Tramandaí", "4323804": "Xangri-lá"}


def test_links_anuais_agrupa_candidatos_por_ano_e_descarta_anos_antigos():
    html = """
    <a href="/upload/arquivos/202610/08160059-site-geral-e-municipios-set-2026-atualizado-em-06-out-2026.xlsx">
    <a href="/upload/arquivos/202506/04152321-site-violencia-contra-as-mulheres-2023-atualizado.xlsx">
    <a href="https://admin.ssp.rs.gov.br/upload/arquivos/202601/15143232-site-violencia-contra-as-mulheres-2023-b.xlsx">
    <a href="/upload/arquivos/202307/12160259-site-violencia-contra-as-mulheres-2012-a-2017.xlsx">
    <a href="/upload/arquivos/202401/11110150-indicadores-criminais-geral-e-por-municipio-2022.xlsx">
    """
    base = "https://www.ssp.rs.gov.br/pagina"
    assert links_anuais(html, "munic", base) == {
        2026: ["https://www.ssp.rs.gov.br/upload/arquivos/202610/"
               "08160059-site-geral-e-municipios-set-2026-atualizado-em-06-out-2026.xlsx"],
        2022: ["https://www.ssp.rs.gov.br/upload/arquivos/202401/11110150-indicadores-criminais-geral-e-por-municipio-2022.xlsx"],
    }
    mulher = links_anuais(html, "mulher", base)
    assert list(mulher) == [2023] and len(mulher[2023]) == 2  # 2012-a-2017 fica de fora


def test_ler_crimes_le_abas_mensais_e_ignora_meses_futuros(tmp_path):
    ano, meses = ler_crimes(_crimes(tmp_path, ano=2026, meses_com_dados=9))
    assert ano == 2026 and sorted(meses) == list(range(1, 10))
    assert meses[1]["TRAMANDAI"] == {"seg_cvli": 2.0, "seg_roubos": 8.0, "seg_furtos": 90.0}
    assert "TOTAL RS" not in meses[1]


def test_cabecalho_de_2022_nome_da_cidade(tmp_path):
    _, meses = ler_crimes(_crimes(tmp_path, ano=2022, cabecalho=["NOME DA CIDADE", *CABECALHO[1:]]))
    assert meses[12]["XANGRI-LA"]["seg_furtos"] == 20.0


def test_coluna_sumida_e_erro_de_layout(tmp_path):
    with pytest.raises(LayoutInesperado, match="CVLI"):
        ler_crimes(_crimes(tmp_path, cabecalho=CABECALHO[:-1]))


def test_ler_estupro_por_mes_ignorando_meses_vazios_e_total(tmp_path):
    ano, meses = ler_estupro(_estupro(tmp_path, ano=2026, meses_com_dados=9))
    assert ano == 2026 and sorted(meses) == list(range(1, 10))
    assert meses[3]["TRAMANDAI"] == {"seg_estupro": 2.0} and "GERAL" not in meses[3]


def test_normalizar_gera_mensal_anual_completo_e_referencia_do_rs(tmp_path):
    planilhas = [ler_crimes(_crimes(tmp_path, ano=2025)), ler_estupro(_estupro(tmp_path, ano=2025)),
                 ler_crimes(_crimes(tmp_path, ano=2026, meses_com_dados=9)),
                 ler_estupro(_estupro(tmp_path, ano=2026, meses_com_dados=9))]
    fatos, refs = normalizar(planilhas, MUNICIPIOS)
    assert ("4321600", "seg_cvli_mes", "2026-09", None, 2.0) in fatos
    assert ("4321600", "seg_estupro_mes", "2025-12", None, 2.0) in fatos
    assert ("4321600", "seg_furtos", "2025", None, 1080.0) in fatos  # 12 x 90
    assert not [f for f in fatos if f[2] == "2026"]  # ano parcial fica fora da série anual
    assert ("seg_cvli_mes", "2025-01", 37.0) in refs  # soma dos municípios, sem a linha "Total RS"
    assert ("seg_estupro_mes", "2025-01", 52.0) in refs


def test_municipio_do_recorte_ausente_e_erro(tmp_path):
    with pytest.raises(LayoutInesperado, match="IMBE"):
        normalizar([ler_crimes(_crimes(tmp_path))], {"4310330": "Imbé"})


def test_nome_sem_hifen_casa_com_o_ibge(tmp_path):
    ano, meses = ler_estupro(_estupro(tmp_path))
    meses = {m: {("XANGRILA" if n == "XANGRI-LA" else n): v for n, v in d.items()} for m, d in meses.items()}
    fatos, _ = normalizar([(ano, meses)], MUNICIPIOS)
    assert ("4323804", "seg_estupro_mes", "2025-01", None, 0.0) in fatos


def test_normalizar_nome():
    assert normalizar_nome("  São José   do Norte ") == "SAO JOSE DO NORTE"
    assert normalizar_nome("Xangri-lá") == "XANGRI-LA"
