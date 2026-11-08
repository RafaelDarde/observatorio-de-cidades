from pathlib import Path

import duckdb

from observatorio.config import DB_PATH

_DDL = """
create table if not exists municipios(
    cod_municipio varchar primary key, cod6 varchar, nome varchar, uf varchar, regiao varchar);
create table if not exists fatos(
    fonte varchar, cod_municipio varchar, indicador varchar, periodo varchar, recorte varchar, valor double);
create table if not exists cargas(
    fonte varchar primary key, carregado_em timestamp, periodo_min varchar, periodo_max varchar, linhas bigint);
create table if not exists referencias(indicador varchar, periodo varchar, valor double);
"""

Fato = tuple[str, str, str, str | None, float]


def conectar(caminho: str | Path = DB_PATH) -> duckdb.DuckDBPyConnection:
    con = duckdb.connect(str(caminho))
    con.execute(_DDL)
    return con


def substituir_fatos(con: duckdb.DuckDBPyConnection, fonte: str, linhas: list[Fato]) -> int:
    con.execute("begin")
    try:
        con.execute("delete from fatos where fonte = ?", [fonte])
        if linhas:
            con.executemany(
                "insert into fatos values (?, ?, ?, ?, ?, ?)", [(fonte, *linha) for linha in linhas]
            )
        periodos = [linha[2] for linha in linhas]
        con.execute(
            "insert or replace into cargas values (?, now(), ?, ?, ?)",
            [fonte, min(periodos, default=None), max(periodos, default=None), len(linhas)],
        )
        con.execute("commit")
    except Exception:
        con.execute("rollback")
        raise
    return len(linhas)
