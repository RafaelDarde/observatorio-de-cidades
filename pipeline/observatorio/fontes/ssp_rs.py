"""SSP-RS: ocorrências mensais por município (planilhas .xlsx das páginas oficiais).

Duas publicações, uma planilha por ano cada, com nomes de arquivo imprevisíveis (links lidos das páginas):
- Indicadores Criminais: abas mensais JAN..DEZ com vítimas de CVLI, roubos e furtos por município.
- Violência contra as Mulheres: aba "Estupro" com uma coluna por mês (vítimas mulheres).

Grava fatos mensais (`seg_*_mes`, período AAAA-MM) e anuais (`seg_*`, só anos completos); o total do RS
(soma dos municípios) vai para a tabela `referencias`, base da nota de segurança (ver derivados.py).
"""
import logging
import re
import unicodedata
import urllib.request
from pathlib import Path
from urllib.parse import urljoin

import openpyxl

from observatorio import rede
from observatorio.banco import substituir_fatos
from observatorio.config import cache_do_dia

log = logging.getLogger(__name__)

FONTE = "ssp_rs"
PAGINA_CRIMES = "https://www.ssp.rs.gov.br/indicadores-criminais"
PAGINA_MULHER = "https://www.ssp.rs.gov.br/indicadores-da-violencia-contra-a-mulher"
# Antes de 2022 a população não é comparável (série começa no Censo 2022).
ANO_INICIAL = 2022
# O firewall da SSP rejeita clientes sem cara de navegador.
CABECALHOS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) "
                  "Chrome/140.0 Safari/537.36",
    "Accept-Language": "pt-BR,pt;q=0.9",
}
# indicador -> trecho do cabeçalho da coluna nas abas mensais dos Indicadores Criminais (normalizado)
COLUNAS_CRIMES = {
    "seg_cvli": "TOTAL DE VITIMAS DE CVLI",
    "seg_roubos": "ROUBOS",
    "seg_furtos": "FURTOS",
}
INDICADORES = [*COLUNAS_CRIMES, "seg_estupro"]
# Primeira célula da linha de cabeçalho nas abas mensais (2022 usa "Nome da cidade").
CABECALHO_MUNICIPIO = {"MUNICIPIOS", "NOME DA CIDADE"}
MESES = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"]
NOMES_MESES = ["JANEIRO", "FEVEREIRO", "MARCO", "ABRIL", "MAIO", "JUNHO", "JULHO", "AGOSTO", "SETEMBRO",
               "OUTUBRO", "NOVEMBRO", "DEZEMBRO"]

# {mês (1-12): {nome normalizado do município: {indicador: valor}}}
Mensal = dict[int, dict[str, dict[str, float]]]


class LayoutInesperado(Exception):
    pass


def normalizar_nome(texto) -> str:
    sem_acento = unicodedata.normalize("NFKD", str(texto)).encode("ascii", "ignore").decode()
    return re.sub(r"\s+", " ", sem_acento.replace("*", "")).strip().upper()


def chave(nome) -> str:
    """Nome para casar municípios entre planilhas (a SSP escreve "XANGRI-LA" e "XANGRILA")."""
    return re.sub(r"[^A-Z0-9]", "", normalizar_nome(nome))


def links_anuais(html: str, padrao: str, base: str) -> dict[int, list[str]]:
    """Ano -> URLs candidatas (na ordem da página, a mais nova primeiro; algumas dão 404)."""
    links: dict[int, list[str]] = {}
    for href in re.findall(r'href="([^"]+\.xlsx)"', html, flags=re.IGNORECASE):
        achado = re.search(padrao + r"[^/]*?(20\d\d)", href.rsplit("/", 1)[-1].lower())
        if achado and int(achado.group(1)) >= ANO_INICIAL:
            url = urljoin(base, href)
            if url not in links.setdefault(int(achado.group(1)), []):
                links[int(achado.group(1))].append(url)
    return links


def _linhas(aba):
    """Linhas sem as células vazias à esquerda (algumas planilhas começam na coluna B)."""
    for linha in aba.iter_rows(values_only=True):
        celulas = list(linha)
        while celulas and celulas[0] is None:
            celulas.pop(0)
        if celulas:
            yield celulas


def _numero(v) -> bool:
    return isinstance(v, (int, float)) and not isinstance(v, bool)


def _ler_aba_crimes(aba, ano: int, mes: int, arquivo: str) -> dict[str, dict[str, float]] | None:
    """Uma aba mensal; None se ela não for do mês/ano esperado (meses futuros vêm com título velho)."""
    indices, dados = None, {}
    for linha in _linhas(aba):
        primeira = normalizar_nome(linha[0])
        if indices is None:
            if primeira.startswith("INDICADORES CRIMINAIS") and f"{NOMES_MESES[mes - 1]} DE {ano}" not in primeira:
                return None
            if primeira in CABECALHO_MUNICIPIO:
                cabecalho = [normalizar_nome(c) if c is not None else "" for c in linha]
                indices = {}
                for ind, trecho in COLUNAS_CRIMES.items():
                    pos = [i for i, c in enumerate(cabecalho) if c == trecho or c.startswith(trecho)]
                    if not pos:
                        raise LayoutInesperado(f"{arquivo} aba {aba.title}: coluna '{trecho}' não encontrada")
                    indices[ind] = pos[0]
            continue
        if primeira.startswith(("TOTAL", "FONTE", "NOTA", "OBS")):
            continue
        valores = {ind: linha[i] if i < len(linha) else None for ind, i in indices.items()}
        if all(_numero(v) for v in valores.values()):
            dados[primeira] = {ind: float(v) for ind, v in valores.items()}
    if indices is None:
        raise LayoutInesperado(f"{arquivo} aba {aba.title}: cabeçalho 'Municípios' não encontrado")
    return dados or None


def ler_crimes(arquivo: Path) -> tuple[int, Mensal]:
    wb = openpyxl.load_workbook(arquivo, read_only=True, data_only=True)
    try:
        anuais = [w.title.strip() for w in wb.worksheets if w.title.strip().isdigit()]
        if not anuais:
            raise LayoutInesperado(f"{arquivo.name}: sem aba anual (abas: {wb.sheetnames})")
        ano = int(anuais[0])
        por_titulo = {normalizar_nome(w.title): w for w in wb.worksheets}
        meses: Mensal = {}
        for mes, sigla in enumerate(MESES, start=1):
            if sigla in por_titulo:
                dados = _ler_aba_crimes(por_titulo[sigla], ano, mes, arquivo.name)
                if dados:
                    meses[mes] = dados
        return ano, meses
    finally:
        wb.close()


def ler_estupro(arquivo: Path) -> tuple[int, Mensal]:
    wb = openpyxl.load_workbook(arquivo, read_only=True, data_only=True)
    try:
        abas = [w for w in wb.worksheets if normalizar_nome(w.title) == "ESTUPRO"]
        if not abas:
            raise LayoutInesperado(f"{arquivo.name}: sem aba 'Estupro' (abas: {wb.sheetnames})")
        ano, colunas, meses = None, None, {}
        for linha in _linhas(abas[0]):
            primeira = normalizar_nome(linha[0])
            if colunas is None:
                achado = re.search(r"ANO DE (20\d\d)", primeira)
                if achado:
                    ano = int(achado.group(1))
                if primeira == "MUNICIPIO":
                    cabecalho = [normalizar_nome(c)[:3] if c is not None else "" for c in linha]
                    colunas = {MESES.index(c) + 1: i for i, c in enumerate(cabecalho) if c in MESES}
                    if len(colunas) != 12:
                        raise LayoutInesperado(f"{arquivo.name}: meses do cabeçalho de Estupro: {cabecalho}")
                continue
            if primeira.startswith(("GERAL", "TOTAL", "FONTE", "OBS")):
                continue
            for mes, i in colunas.items():
                if i < len(linha) and _numero(linha[i]):
                    meses.setdefault(mes, {})[primeira] = {"seg_estupro": float(linha[i])}
        if ano is None or colunas is None:
            raise LayoutInesperado(f"{arquivo.name}: título com o ano ou cabeçalho 'Município' não encontrado")
        return ano, meses
    finally:
        wb.close()


def normalizar(planilhas: list[tuple[int, Mensal]], municipios: dict[str, str]
               ) -> tuple[list[tuple], list[tuple]]:
    """Fatos mensais e anuais dos municípios do recorte e referências mensais do RS (soma dos municípios)."""
    por_nome = {chave(nome): cod for cod, nome in municipios.items()}
    # (indicador, ano, mês) -> {nome: valor}; crimes e estupro vêm de arquivos diferentes
    valores: dict[tuple[str, int, int], dict[str, float]] = {}
    for ano, meses in planilhas:
        for mes, dados in meses.items():
            dados = {chave(nome): inds for nome, inds in dados.items()}
            faltando = sorted(set(por_nome) - set(dados))
            if faltando:
                raise LayoutInesperado(f"SSP-RS {ano}-{mes:02d}: municípios do recorte não encontrados: {faltando}")
            for nome, inds in dados.items():
                for ind, v in inds.items():
                    valores.setdefault((ind, ano, mes), {})[nome] = v

    fatos, referencias = [], []
    for (ind, ano, mes), dados in sorted(valores.items()):
        periodo = f"{ano}-{mes:02d}"
        fatos += [(cod, f"{ind}_mes", periodo, None, dados[nome]) for nome, cod in por_nome.items()]
        referencias.append((f"{ind}_mes", periodo, sum(dados.values())))
    for ind in INDICADORES:
        for ano in sorted({a for i, a, _ in valores if i == ind}):
            if all((ind, ano, m) in valores for m in range(1, 13)):
                fatos += [(cod, ind, str(ano), None, sum(valores[(ind, ano, m)][nome] for m in range(1, 13)))
                          for nome, cod in por_nome.items()]
            else:
                log.info("SSP-RS %s %s: ano incompleto, fora da série anual", ind, ano)
    return fatos, referencias


def _abrir(url: str, timeout: int):
    return urllib.request.urlopen(urllib.request.Request(url, headers=CABECALHOS), timeout=timeout)


def _dir() -> Path:
    return cache_do_dia(FONTE)


def _baixar_planilhas(pagina: str, padrao: str, prefixo: str) -> list[Path]:
    html = rede.baixar(pagina, _dir() / f"{prefixo}.html", abrir=_abrir).read_text(encoding="utf-8", errors="replace")
    links = links_anuais(html, padrao, pagina)
    if not links:
        raise LayoutInesperado(f"nenhuma planilha anual encontrada em {pagina}")
    arquivos = []
    for ano, urls in sorted(links.items()):
        for url in urls:  # a página tem links quebrados; vale o primeiro que baixar
            try:
                arquivos.append(rede.baixar(url, _dir() / f"{prefixo}-{ano}.xlsx", abrir=_abrir, tentativas=1,
                                            timeout=180))
                break
            except OSError as erro:
                log.warning("SSP-RS %s %s: %s falhou (%s)", prefixo, ano, url, erro)
        else:
            raise LayoutInesperado(f"SSP-RS {prefixo} {ano}: nenhum link baixou")
    return arquivos


def baixar() -> list[Path]:
    return (_baixar_planilhas(PAGINA_CRIMES, "munic", "crimes")
            + _baixar_planilhas(PAGINA_MULHER, "mulher", "mulher"))


def _ultimo_dir() -> Path:
    # O download mais recente, mesmo de outro dia (ex.: `atualizar --fonte caged` não baixa a SSP).
    dirs = sorted(p for p in _dir().parent.glob("*") if any(p.glob("mulher-*.xlsx")))
    if not dirs:
        raise FileNotFoundError(f"planilhas da SSP-RS ainda não baixadas (nada em {_dir().parent})")
    return dirs[-1]


def carregar(con) -> int:
    pasta = _ultimo_dir()
    planilhas = ([ler_crimes(a) for a in sorted(pasta.glob("crimes-*.xlsx"))]
                 + [ler_estupro(a) for a in sorted(pasta.glob("mulher-*.xlsx"))])
    municipios = dict(con.execute("select cod_municipio, nome from municipios").fetchall())
    fatos, referencias = normalizar(planilhas, municipios)
    n = substituir_fatos(con, FONTE, fatos)
    con.execute("begin")
    con.execute("delete from referencias where indicador like 'seg\\_%' escape '\\'")
    con.executemany("insert into referencias values (?, ?, ?)", referencias)
    con.execute("commit")
    return n
