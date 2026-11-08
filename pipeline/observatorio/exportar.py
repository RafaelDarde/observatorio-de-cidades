"""DuckDB -> JSONs do site (web/public/dados), validados contra schema/dados.schema.json.

Regra do "último período": é o período mais recente do indicador no país inteiro. Município sem
valor nesse período fica com `ultimo` e `posicao` nulos, mas mantém a `serie`.
"""
import dataclasses
import json
import shutil
from datetime import datetime, timezone
from pathlib import Path

import jsonschema

from observatorio.catalogo import Indicador
from observatorio.config import SAIDA_DIR, SCHEMA_PATH

CASAS = 2

_ULTIMOS = """
    select indicador, max(periodo) as periodo from fatos where recorte is null group by indicador
"""


def _validador(definicao: str) -> jsonschema.protocols.Validator:
    schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
    sub = {"$defs": schema["$defs"], "$ref": f"#/$defs/{definicao}"}
    return jsonschema.Draft202012Validator(sub)


def _num(v: float) -> float:
    return round(float(v), CASAS)


def montar_perfis(con, catalogo: dict[str, Indicador]) -> dict[str, dict]:
    ids = list(catalogo)
    com_ranking = {i for i, c in catalogo.items() if c.ranking}

    perfis = {
        cod: {"cod": cod, "nome": nome, "uf": uf, "regiao": regiao, "indicadores": {i: None for i in ids}}
        for cod, nome, uf, regiao in con.execute(
            "select cod_municipio, nome, uf, regiao from municipios order by cod_municipio").fetchall()
    }

    def _ind(cod: str, indicador: str) -> dict:
        atual = perfis[cod]["indicadores"][indicador]
        if atual is None:
            atual = {"serie": [], "ultimo": None, "posicao": None}
            perfis[cod]["indicadores"][indicador] = atual
        return atual

    serie = con.execute("""
        select cod_municipio, indicador, periodo, valor from fatos
        where recorte is null and indicador in (select unnest(?)) order by cod_municipio, indicador, periodo
    """, [ids]).fetchall()
    for cod, indicador, periodo, valor in serie:
        if cod in perfis:
            _ind(cod, indicador)["serie"].append({"periodo": periodo, "valor": _num(valor)})

    ultimos = con.execute(f"""
        with u as ({_ULTIMOS})
        select f.cod_municipio, f.indicador, f.periodo, f.valor,
               rank() over (partition by f.indicador order by f.valor desc) as posicao,
               count(*) over (partition by f.indicador) as total
        from fatos f join u using (indicador, periodo) join municipios m using (cod_municipio)
        where f.recorte is null
    """).fetchall()
    for cod, indicador, periodo, valor, posicao, total in ultimos:
        if indicador not in catalogo:
            continue
        ind = _ind(cod, indicador)
        ind["ultimo"] = {"periodo": periodo, "valor": _num(valor)}
        if indicador in com_ranking:
            ind["posicao"] = {"posicao": int(posicao), "total": int(total)}

    recortes = con.execute(f"""
        with u as ({_ULTIMOS})
        select f.cod_municipio, f.indicador, f.recorte, f.valor
        from fatos f join u using (indicador, periodo)
        where f.recorte is not null order by f.cod_municipio, f.indicador, f.recorte
    """).fetchall()
    for cod, indicador, recorte, valor in recortes:
        if indicador in catalogo and cod in perfis:
            _ind(cod, indicador).setdefault("por_recorte", []).append({"recorte": recorte, "valor": _num(valor)})

    return perfis


def montar_ranking(con, indicador: str) -> list[dict]:
    linhas = con.execute(f"""
        with u as ({_ULTIMOS})
        select f.cod_municipio, m.nome, m.uf, f.valor, rank() over (order by f.valor desc) as pos
        from fatos f join u using (indicador, periodo) join municipios m using (cod_municipio)
        where f.recorte is null and f.indicador = ?
        order by pos, m.nome
    """, [indicador]).fetchall()
    return [{"cod": c, "nome": n, "uf": uf, "valor": _num(v), "posicao": int(p)} for c, n, uf, v, p in linhas]


def _catalogo_json(con, catalogo: dict[str, Indicador]) -> list[dict]:
    periodos = dict((i, (a, b)) for i, a, b in con.execute(
        "select indicador, min(periodo), max(periodo) from fatos where recorte is null group by indicador").fetchall())
    return [dataclasses.asdict(c) | dict(zip(("periodo_min", "periodo_max"), periodos.get(i, (None, None))))
            for i, c in catalogo.items()]


def _meta(con) -> dict:
    fontes = {f: {"carregado_em": c.isoformat(timespec="seconds"), "periodo_min": a, "periodo_max": b}
              for f, c, a, b in con.execute(
                  "select fonte, carregado_em, periodo_min, periodo_max from cargas order by fonte").fetchall()}
    return {"gerado_em": datetime.now(timezone.utc).isoformat(timespec="seconds"), "fontes": fontes}


def _gravar(caminho: Path, objeto) -> None:
    caminho.parent.mkdir(parents=True, exist_ok=True)
    caminho.write_text(json.dumps(objeto, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def exportar(con, catalogo: dict[str, Indicador], saida: Path = SAIDA_DIR) -> None:
    saida = Path(saida)
    tmp = saida.with_name(saida.name + ".novo")
    shutil.rmtree(tmp, ignore_errors=True)
    try:
        cat = _catalogo_json(con, catalogo)
        _validador("catalogo").validate(cat)
        _gravar(tmp / "catalogo.json", cat)

        perfis = montar_perfis(con, catalogo)
        indice = [{"cod": p["cod"], "nome": p["nome"], "uf": p["uf"]} for p in perfis.values()]
        _validador("indiceMunicipios").validate(indice)
        _gravar(tmp / "municipios.json", indice)

        v_perfil = _validador("perfil")
        for cod, perfil in perfis.items():
            v_perfil.validate(perfil)
            _gravar(tmp / "municipios" / f"{cod}.json", perfil)

        v_ranking = _validador("ranking")
        for indicador in (i for i, c in catalogo.items() if c.ranking):
            ranking = montar_ranking(con, indicador)
            v_ranking.validate(ranking)
            _gravar(tmp / "rankings" / f"{indicador}.json", ranking)

        meta = _meta(con)
        _validador("meta").validate(meta)
        _gravar(tmp / "meta.json", meta)
    except Exception:
        shutil.rmtree(tmp, ignore_errors=True)
        raise

    antigo = saida.with_name(saida.name + ".antigo")
    if antigo.exists():
        shutil.rmtree(antigo)  # sobra de execução anterior; falha aqui é melhor que trocar pela metade
    tinha_saida = saida.exists()
    if tinha_saida:
        saida.rename(antigo)
    try:
        tmp.rename(saida)
    except Exception:
        if tinha_saida:
            antigo.rename(saida)
        shutil.rmtree(tmp, ignore_errors=True)
        raise
    shutil.rmtree(antigo, ignore_errors=True)
