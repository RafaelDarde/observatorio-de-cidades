"""Checagens que barram a exportação de dados inconsistentes. Lista vazia = ok."""


def validar(con, total_municipios_esperado: int) -> list[str]:
    erros = []

    n = con.execute("select count(*) from municipios").fetchone()[0]
    if n != total_municipios_esperado:
        erros.append(f"municípios: {n} no banco, {total_municipios_esperado} no recorte")

    dup = con.execute("""
        select fonte, cod_municipio, indicador, periodo, recorte, count(*) from fatos
        group by all having count(*) > 1 limit 5
    """).fetchall()
    if dup:
        erros.append(f"fatos duplicados (até 5 exemplos): {dup}")

    sem_pop = con.execute("""
        select nome from municipios where cod_municipio not in
            (select cod_municipio from fatos where indicador = 'populacao') order by nome
    """).fetchall()
    if sem_pop:
        erros.append(f"municípios sem população: {[n[0] for n in sem_pop]}")

    orfaos = con.execute("""
        select distinct cod_municipio from fatos
        where cod_municipio not in (select cod_municipio from municipios) limit 5
    """).fetchall()
    if orfaos:
        erros.append(f"códigos de município desconhecidos em fatos: {[o[0] for o in orfaos]}")

    return erros
