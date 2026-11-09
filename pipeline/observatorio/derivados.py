"""Indicadores derivados, calculados a partir de `fatos` e gravados com fonte 'derivado'."""
from observatorio.banco import substituir_fatos
from observatorio.seguranca import notas_seguranca

_SQL = """
with pop as (
    select cod_municipio, cast(periodo as int) as ano, valor from fatos
    where indicador = 'populacao' and recorte is null
),
ultimo_ano as (select max(ano) as ano from pop),
var_censo as (
    select a.cod_municipio, 'populacao_var_censo' as indicador, cast(a.ano as varchar) as periodo,
           (a.valor / b.valor - 1) * 100 as valor
    from pop a join ultimo_ano u on a.ano = u.ano
    join pop b on b.cod_municipio = a.cod_municipio and b.ano = 2022
),
-- População do ano do PIB; sem estimativa naquele ano (ex.: 2023), média dos anos vizinhos.
pib as (
    select cod_municipio, cast(periodo as int) as ano, valor from fatos
    where indicador = 'pib' and recorte is null
),
per_capita as (
    select p.cod_municipio, 'pib_per_capita' as indicador, cast(p.ano as varchar) as periodo,
           p.valor * 1000 / coalesce(m.valor, (a.valor + d.valor) / 2) as valor
    from pib p
    left join pop m on m.cod_municipio = p.cod_municipio and m.ano = p.ano
    left join pop a on a.cod_municipio = p.cod_municipio and a.ano = p.ano - 1
    left join pop d on d.cod_municipio = p.cod_municipio and d.ano = p.ano + 1
    where coalesce(m.valor, (a.valor + d.valor) / 2) is not null
),
saldo as (
    select cod_municipio, periodo, valor from fatos where indicador = 'caged_saldo' and recorte is null
),
ultimo_mes as (select max(periodo) as m from saldo),
janela as (
    select distinct periodo from saldo order by periodo desc limit 12
),
saldo12 as (
    select s.cod_municipio, 'caged_saldo_12m' as indicador, (select m from ultimo_mes) as periodo,
           sum(s.valor) as valor
    from saldo s join janela j using (periodo)
    group by s.cod_municipio  -- mês sem linha no CAGED = zero movimentação
),
por_mil as (
    select s.cod_municipio, 'caged_saldo_12m_por_mil_hab' as indicador, s.periodo,
           s.valor / p.valor * 1000 as valor
    from saldo12 s join pop p on p.cod_municipio = s.cod_municipio
    join ultimo_ano u on p.ano = u.ano
)
select cod_municipio, indicador, periodo, null as recorte, valor from var_censo
union all select cod_municipio, indicador, periodo, null, valor from per_capita
union all select cod_municipio, indicador, periodo, null, valor from saldo12
union all select cod_municipio, indicador, periodo, null, valor from por_mil
"""

# Taxas anuais de segurança por 100 mil habitantes (anos completos).
SEGURANCA = ["seg_cvli", "seg_estupro", "seg_roubos", "seg_furtos"]

_SQL_TAXAS = """
with pop as (
    select cod_municipio, cast(periodo as int) as ano, valor from fatos
    where indicador = 'populacao' and recorte is null
),
seg as (
    select cod_municipio, indicador, cast(periodo as int) as ano, valor from fatos
    where indicador in (select unnest($inds)) and recorte is null
),
-- População do ano; sem estimativa naquele ano (ex.: 2023), média dos anos vizinhos.
pop_ano as (
    select s.cod_municipio, s.ano, coalesce(m.valor, (a.valor + d.valor) / 2) as pop
    from (select distinct cod_municipio, ano from seg) s
    left join pop m on m.cod_municipio = s.cod_municipio and m.ano = s.ano
    left join pop a on a.cod_municipio = s.cod_municipio and a.ano = s.ano - 1
    left join pop d on d.cod_municipio = s.cod_municipio and d.ano = s.ano + 1
)
select s.cod_municipio, replace(s.indicador, 'seg_', 'seg_taxa_') as indicador,
       cast(s.ano as varchar) as periodo, null as recorte, s.valor / p.pop * 100000 as valor
from seg s join pop_ano p using (cod_municipio, ano) where p.pop is not null
"""


def calcular_derivados(con) -> int:
    linhas = con.execute(_SQL).fetchall()
    linhas += con.execute(_SQL_TAXAS, {"inds": SEGURANCA}).fetchall()
    linhas += notas_seguranca(con)
    return substituir_fatos(con, "derivado", linhas, verificar=False)
