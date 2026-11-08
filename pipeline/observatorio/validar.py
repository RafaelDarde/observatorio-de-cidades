"""Checagens que barram a exportação de dados inconsistentes. Lista vazia = ok."""


def validar(con, total_municipios_api: int) -> list[str]:
    erros = []

    n = con.execute("select count(*) from municipios").fetchone()[0]
    if n != total_municipios_api:
        erros.append(f"municípios: {n} no banco, {total_municipios_api} na API de localidades")

    dup = con.execute("""
        select fonte, cod_municipio, indicador, periodo, recorte, count(*) from fatos
        group by all having count(*) > 1 limit 5
    """).fetchall()
    if dup:
        erros.append(f"fatos duplicados (até 5 exemplos): {dup}")

    pop = con.execute("""
        with ano as (
            select max(periodo) as p from referencias
            where indicador = 'populacao'
              and periodo in (select periodo from fatos where indicador = 'populacao')
        )
        select (select sum(valor) from fatos where indicador = 'populacao' and recorte is null
                and periodo = (select p from ano)),
               (select valor from referencias where indicador = 'populacao' and periodo = (select p from ano)),
               (select p from ano)
    """).fetchone()
    soma, total, ano = pop
    if total and abs(soma / total - 1) > 0.01:
        erros.append(f"população {ano}: soma dos municípios {soma:.0f} difere mais de 1% do total Brasil {total:.0f}")

    orfaos = con.execute("""
        select distinct cod_municipio from fatos
        where cod_municipio not in (select cod_municipio from municipios) limit 5
    """).fetchall()
    if orfaos:
        erros.append(f"códigos de município desconhecidos em fatos: {[o[0] for o in orfaos]}")

    return erros
