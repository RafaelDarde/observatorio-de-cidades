import openpyxl
import pytest

from observatorio.fontes.ssp_rs import LayoutInesperado, ler_planilha, links_anuais, normalizar, normalizar_nome

CABECALHO = [" Municípios", " Homicídio  Doloso", "Total de vítimas de Homicidio Doloso", " Latrocínio", " Furtos",
             "Abigeato*", "Furto de Veículo ", " Roubos", " Roubo de Veículo", "Total de Vítimas de CVLI*"]


def _planilha(caminho, ano=2025, ate="31 de dezembro", linhas=None, cabecalho=CABECALHO):
    wb = openpyxl.Workbook()
    wb.active.title = "GERAL"
    ws = wb.create_sheet(str(ano))
    ws.append(["Secretaria da Segurança Pública do Estado do Rio Grande do Sul"])
    ws.append([])
    ws.append([f"Indicadores Criminais por município - Período: de 01 de janeiro a {ate} de {ano} - Fato Consumado"])
    ws.append([])
    ws.append(cabecalho)
    for linha in linhas if linhas is not None else [
        ["TRAMANDAI", 12, 13, 0, 1096, 11, 68, 99, 8, 17],
        ["XANGRI-LA", 1, 1, 0, 233, 1, 9, 20, 2, 1],
        ["PORTO ALEGRE", 300, 320, 5, 40000, 0, 900, 9000, 800, 350],
        ["Total RS", 313, 334, 5, 41329, 12, 977, 9119, 810, 368],
        ["Fonte: PROCERGS/OESP"],
    ]:
        ws.append(linha)
    wb.create_sheet("JAN")
    arquivo = caminho / f"{ano}.xlsx"
    wb.save(arquivo)
    return arquivo


def test_links_anuais_le_os_padroes_de_nome_e_descarta_anos_antigos():
    html = """
    <a href="/upload/arquivos/202610/08160059-site-geral-e-municipios-set-2026-atualizado-em-06-out-2026.xlsx">
    <a href="/upload/arquivos/202610/08160105-site-geral-e-municipios-ano-2025-atualizado-em-06-out-2026.xlsx">
    <a href="https://admin.ssp.rs.gov.br/upload/arquivos/202503/28094229-site-geral-e-munici-pios-ano-2023-x.xlsx">
    <a href="/upload/arquivos/202401/11110150-indicadores-criminais-geral-e-por-municipio-2022.xlsx">
    <a href="/upload/arquivos/202312/04103647-site-geral-e-municipios-ano-2021-atualizado.xlsx">
    <a href="/upload/arquivos/202401/outro-documento-2025.pdf">
    """
    links = links_anuais(html)
    assert sorted(links) == [2022, 2023, 2025, 2026]
    assert links[2025] == ("https://www.ssp.rs.gov.br/upload/arquivos/202610/"
                           "08160105-site-geral-e-municipios-ano-2025-atualizado-em-06-out-2026.xlsx")
    assert links[2023].startswith("https://admin.ssp.rs.gov.br/")


def test_ler_planilha_extrai_colunas_e_ignora_total_e_notas(tmp_path):
    ano, completo, dados = ler_planilha(_planilha(tmp_path))
    assert (ano, completo) == (2025, True)
    assert set(dados) == {"TRAMANDAI", "XANGRI-LA", "PORTO ALEGRE"}
    assert dados["TRAMANDAI"] == {"seg_cvli": 17.0, "seg_roubos": 99.0, "seg_furtos": 1096.0}


def test_ano_parcial_marcado_como_incompleto(tmp_path):
    _, completo, _ = ler_planilha(_planilha(tmp_path, ano=2026, ate="30 de setembro"))
    assert completo is False


def test_coluna_sumida_e_erro_de_layout(tmp_path):
    sem_cvli = CABECALHO[:-1]
    with pytest.raises(LayoutInesperado, match="CVLI"):
        ler_planilha(_planilha(tmp_path, cabecalho=sem_cvli, linhas=[]))


def test_normalizar_casa_nomes_e_soma_rs_com_todos_os_municipios(tmp_path):
    planilhas = [ler_planilha(_planilha(tmp_path)), ler_planilha(_planilha(tmp_path, ano=2026, ate="30 de setembro"))]
    fatos, refs = normalizar(planilhas, {"4321600": "Tramandaí", "4323804": "Xangri-lá"})
    assert ("4321600", "seg_cvli", "2025", None, 17.0) in fatos
    assert ("4323804", "seg_furtos", "2025", None, 233.0) in fatos
    assert {f[2] for f in fatos} == {"2025"}  # 2026 parcial fica de fora
    assert ("seg_cvli", "2025", 368.0) in refs  # soma dos municípios, sem a linha "Total RS"


def test_municipio_do_recorte_ausente_na_planilha_e_erro(tmp_path):
    with pytest.raises(LayoutInesperado, match="IMBE"):
        normalizar([ler_planilha(_planilha(tmp_path))], {"4310330": "Imbé"})


def test_normalizar_nome():
    assert normalizar_nome("  São José   do Norte ") == "SAO JOSE DO NORTE"
    assert normalizar_nome("Xangri-lá") == "XANGRI-LA"
