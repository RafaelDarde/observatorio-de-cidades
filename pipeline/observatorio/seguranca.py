"""Nota de segurança (0–100; 50 = média do RS; maior = mais seguro).

Inspirada no Índice Sentinel (mapadecrimes.ia.br/metodologia) e no IECV do Instituto Sou da Paz:

1. Janela de 12 meses consecutivos; a nota é recalculada para cada mês final (série mensal).
2. Por dimensão, taxa do município suavizada: soma-se o equivalente a SUAVIZACAO ocorrências na taxa do
   RS, o que puxa para a média cidades pequenas com poucos casos.
3. Razão contra a taxa do RS no mesmo período, em log2 e limitada a ±LIMITE_LOG2 (4x).
4. Nota = 50 − 50 · Σ peso · log2(razão), limitada a 0–100. Dobro do RS em tudo = 0; metade = 100.

Ajuste de veraneio (nos moldes do IECV Litoral): os meses de alta temporada são substituídos pelo
ritmo dos meses de baixa temporada, corrigido pela sazonalidade do próprio RS. Assim sai só o excesso de
ocorrências do verão que é específico da cidade, não a variação que acontece no estado inteiro. O ajuste
só reduz ocorrências: cidade com verão mais calmo que o RS fica com a mesma nota.
"""
import math
from collections import defaultdict

PESOS = {"seg_cvli": 0.40, "seg_estupro": 0.20, "seg_roubos": 0.25, "seg_furtos": 0.15}
DIMENSOES = {"seg_cvli": "Mortes violentas", "seg_estupro": "Estupro", "seg_roubos": "Roubos",
             "seg_furtos": "Furtos"}
SUAVIZACAO = 3.0
LIMITE_LOG2 = 2.0
ALTA_TEMPORADA = {12, 1, 2, 3}  # verão no litoral gaúcho


def _meses_anteriores(fim: str, n: int = 12) -> list[str]:
    ano, mes = map(int, fim.split("-"))
    meses = []
    for _ in range(n):
        meses.append(f"{ano}-{mes:02d}")
        ano, mes = (ano - 1, 12) if mes == 1 else (ano, mes - 1)
    return meses[::-1]


def _populacao(serie: dict[int, float], ano: int) -> float | None:
    """Do ano; sem estimativa, média dos vizinhos; depois da última, a última (ex.: mês de ano sem estimativa)."""
    if ano in serie:
        return serie[ano]
    if ano - 1 in serie and ano + 1 in serie:
        return (serie[ano - 1] + serie[ano + 1]) / 2
    anteriores = [a for a in serie if a < ano]
    return serie[max(anteriores)] if anteriores and ano > max(serie) else None


def nota_dimensao(ocorrencias: float, populacao: float, taxa_rs: float) -> float:
    """log2 da razão entre a taxa suavizada do município e a do RS, limitada."""
    suavizada = (ocorrencias + SUAVIZACAO) / (populacao + SUAVIZACAO / taxa_rs)
    return max(-LIMITE_LOG2, min(LIMITE_LOG2, math.log2(suavizada / taxa_rs)))


def nota(logs: dict[str, float]) -> float:
    return max(0.0, min(100.0, 50 - 50 * sum(PESOS[d] * logs[d] for d in PESOS)))


def notas_seguranca(con) -> list[tuple]:
    mensal = defaultdict(dict)  # (cod, dimensão) -> {AAAA-MM: valor}
    for cod, ind, periodo, valor in con.execute(
            "select cod_municipio, indicador, periodo, valor from fatos "
            "where indicador like 'seg\\_%\\_mes' escape '\\' and recorte is null").fetchall():
        mensal[(cod, ind.removesuffix("_mes"))][periodo] = valor
    rs = defaultdict(dict)
    for ind, periodo, valor in con.execute(
            "select indicador, periodo, valor from referencias where indicador like 'seg\\_%\\_mes' escape '\\'"
    ).fetchall():
        rs[ind.removesuffix("_mes")][periodo] = valor
    pop = defaultdict(dict)
    for cod, ano, valor in con.execute("select cod_municipio, cast(periodo as int), valor from fatos "
                                       "where indicador = 'populacao' and recorte is null").fetchall():
        pop[cod][ano] = valor
    pop_rs = {int(a): v for a, v in con.execute(
        "select periodo, valor from referencias where indicador = 'populacao'").fetchall()}
    if not all(d in rs for d in PESOS) or not pop_rs:
        return []

    comuns = sorted(set.intersection(*(set(rs[d]) for d in PESOS)))
    fins = [m for m in comuns if set(_meses_anteriores(m)) <= set(comuns)]
    municipios = sorted({cod for cod, _ in mensal})
    linhas = []
    for fim in fins:
        janela = _meses_anteriores(fim)
        ano = int(fim[:4])
        p_rs = _populacao(pop_rs, ano)
        if not p_rs:
            continue
        taxa_rs = {d: sum(rs[d][m] for m in janela) / p_rs for d in PESOS}
        if any(t <= 0 for t in taxa_rs.values()):
            continue
        # Fator do RS para o ajuste de veraneio: total do ano ÷ total da baixa temporada.
        baixa = [m for m in janela if int(m[5:]) not in ALTA_TEMPORADA]
        fator_rs = {d: sum(rs[d][m] for m in janela) / max(sum(rs[d][m] for m in baixa), 1e-9) for d in PESOS}
        for cod in municipios:
            p = _populacao(pop[cod], ano)
            if not p or any(m not in mensal[(cod, d)] for d in PESOS for m in janela):
                continue
            logs, logs_veraneio = {}, {}
            for d in PESOS:
                total = sum(mensal[(cod, d)][m] for m in janela)
                # Só desconta excesso: cidade com verão mais calmo que o RS não é penalizada.
                ajustado = min(total, sum(mensal[(cod, d)][m] for m in baixa) * fator_rs[d])
                logs[d] = nota_dimensao(total, p, taxa_rs[d])
                logs_veraneio[d] = nota_dimensao(ajustado, p, taxa_rs[d])
            linhas.append((cod, "seg_nota", fim, None, nota(logs)))
            linhas.append((cod, "seg_nota_veraneio", fim, None, nota(logs_veraneio)))
            if fim == fins[-1]:
                linhas += [(cod, "seg_nota", fim, DIMENSOES[d], max(0.0, min(100.0, 50 - 50 * logs[d])))
                           for d in PESOS]
    return linhas
