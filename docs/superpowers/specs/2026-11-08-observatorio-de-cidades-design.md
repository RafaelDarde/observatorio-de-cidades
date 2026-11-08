# Observatório de Cidades — Design do MVP

Data: 2026-11-08
Status: aprovado em conversa, aguardando revisão da spec escrita

## 1. Intenção

**O que é:** aplicação web que reúne dados públicos oficiais e gratuitos de municípios brasileiros (IBGE e Ministério do Trabalho no MVP) e os apresenta como perfil municipal, comparação e rankings.

**Para quem e por quê:** projeto de estudo pessoal do autor. Não há usuários externos, captura de leads nem metas comerciais. O valor está em praticar, de ponta a ponta, um produto de dados real: ETL em Python/DuckDB e front-end em Next.js.

**Critérios de sucesso do MVP:**
1. Consultar o perfil de qualquer um dos municípios brasileiros com população, PIB, empresas e emprego.
2. Comparar até 3 municípios lado a lado.
3. Ver rankings por indicador, com filtro por UF.
4. Adicionar uma fonte nova exige só um módulo novo no pipeline e entradas no catálogo, sem mudar o front nem o exportador.
5. Custo de infraestrutura zero.

**Decisões tomadas na conversa:**
- Cobertura: Brasil inteiro. Restringir ao RS economizaria pouco, porque as fontes vêm nacionais, e empobreceria rankings e comparações.
- Stack: pipeline em Python/DuckDB e front em Next.js, em um repositório só.
- Dados de empresas e emprego: IBGE CEMPRE + Novo CAGED. A base CNPJ da Receita Federal fica para a fase 2.
- Entrega dos dados: arquivos JSON estáticos gerados pelo pipeline e servidos com o site.

## 2. Arquitetura

```
observatorio/
  pipeline/                  # Python (uv + DuckDB)
    observatorio/
      fontes/
        ibge_municipios.py   # lista oficial de municípios, UF, região
        ibge_populacao.py    # estimativas anuais + Censo 2022
        ibge_pib.py          # PIB, PIB per capita, VAB por setor
        ibge_cempre.py       # unidades locais, pessoal ocupado, salário médio
        caged.py             # admissões, desligamentos, saldo mensal
      indicadores.yaml       # catálogo de indicadores
      banco.py               # conexão DuckDB e criação de tabelas
      validar.py             # checagens antes de exportar
      exportar.py            # DuckDB -> JSON
      cli.py                 # comando `observatorio`
    tests/
      fixtures/              # amostras pequenas de respostas brutas
  schema/
    dados.schema.json        # JSON Schema do contrato de dados
  web/                       # Next.js
    public/dados/            # saída do pipeline (versionada no git)
  _cache/                    # downloads brutos (gitignored)
  observatorio.duckdb        # banco local (gitignored)
```

**Fluxo:** `baixar` → `carregar` no DuckDB → `validar` → `exportar` JSON → commit → deploy.

### 2.1 Contrato de fonte

Cada módulo em `fontes/` expõe:
- `baixar() -> list[Path]`: grava o bruto em `_cache/<fonte>/` e não baixa de novo o que já está lá.
- `carregar(con) -> int`: lê os brutos, normaliza e grava em `fatos`, substituindo as linhas anteriores daquela fonte. Devolve o número de linhas.

### 2.2 Modelo de dados (DuckDB)

- `municipios(cod_municipio CHAR(7) PK, cod6 CHAR(6), nome, uf, regiao)`, vinda da API de localidades do IBGE.
- `fatos(fonte, cod_municipio, indicador, periodo, recorte, valor DOUBLE)`, em formato longo.
  - `periodo`: `"AAAA"` ou `"AAAA-MM"`.
  - `recorte`: dimensão opcional (por exemplo, seção CNAE). É `NULL` quando o valor é o total.
- `cargas(fonte, carregado_em, periodo_min, periodo_max, linhas)`: registra a última carga bem-sucedida de cada fonte.

### 2.3 Catálogo (`indicadores.yaml`)

Cada indicador tem `id`, `nome`, `unidade` (`pessoas`, `R$`, `R$ mil`, `salarios_minimos`, `empregos`, `%`), `fonte`, `descricao`, `tema` (`populacao`, `economia`, `empresas`, `emprego`), `relativo` (bool: se é adequado para comparar municípios de tamanhos diferentes), `motivo_ausencia` (texto mostrado quando falta o dado) e `ranking` (bool).

### 2.4 Fontes e indicadores do MVP

| Fonte | Acesso | Indicadores |
|---|---|---|
| IBGE Localidades | `servicodados.ibge.gov.br/api/v1/localidades/municipios` | lista de municípios (não é indicador) |
| IBGE População | API SIDRA: estimativas anuais (tabela 6579) e Censo 2022 (tabela 4709) | `populacao` (a partir do Censo 2022), `populacao_var_censo` (derivado, %: variação desde o Censo 2022) |
| IBGE PIB dos Municípios | API SIDRA (tabela 5938) | `pib`, `pib_per_capita`, `vab_agro`, `vab_industria`, `vab_servicos`, `vab_adm_publica` |
| IBGE CEMPRE | API SIDRA (tabela municipal por seção CNAE 2.0, 1685) | `cempre_unidades_locais`, `cempre_pessoal_ocupado`, `cempre_salario_medio_sm` (com recorte por seção CNAE) |
| Novo CAGED (MTE) | microdados mensais no FTP do PDET (`ftp.mtps.gov.br/pdet/microdados/NOVO CAGED/`) | `caged_admissoes`, `caged_desligamentos`, `caged_saldo` (mensais, com recorte por grande setor), `caged_saldo_12m` e `caged_saldo_12m_por_mil_hab` (derivados) |

A primeira tarefa de implementação de cada fonte SIDRA confirma no próprio SIDRA o número da tabela e o código das variáveis antes de escrever o parser. O CAGED cobre os últimos 24 meses disponíveis, configurável em `cli.py`.

## 3. Contrato de dados (JSON)

Gerados em `web/public/dados/` e validados contra `schema/dados.schema.json`:

| Arquivo | Conteúdo |
|---|---|
| `catalogo.json` | o `indicadores.yaml` em JSON, com o período coberto por indicador |
| `municipios.json` | `[{cod, nome, uf}]`, o índice da busca |
| `municipios/{cod}.json` | perfil completo do município |
| `rankings/{indicador}.json` | `[{cod, nome, uf, valor, posicao}]` para o último período, ordenado de forma decrescente |
| `meta.json` | `{gerado_em, fontes: {fonte: {carregado_em, periodo_min, periodo_max}}}` |

**Perfil (`municipios/{cod}.json`):**
```json
{
  "cod": "4314902",
  "nome": "Porto Alegre",
  "uf": "RS",
  "regiao": "Sul",
  "indicadores": {
    "<id_indicador>": {
      "serie": [{"periodo": "2022", "valor": 0}],
      "ultimo": {"periodo": "2025", "valor": 0},
      "posicao": {"brasil": 0, "uf": 0},
      "por_recorte": [{"recorte": "G - Comércio", "valor": 0}]
    }
  }
}
```
Regras:
- Todo indicador tem a mesma forma.
- `por_recorte` é omitido quando o indicador não tem recorte. Quando tem, refere-se ao período de `ultimo`.
- `posicao` aparece só quando o indicador tem `ranking: true` no catálogo. A ordem é decrescente.
- Indicador sem dado para o município aparece como `null`. Ausência de dado nunca é exportada como zero.
- Os tipos TypeScript do front são gerados a partir do JSON Schema (`json-schema-to-typescript`).

## 4. Front-end

**Stack:** Next.js (App Router), `output: 'export'` (site 100% estático), TypeScript, Tailwind e Recharts. Deploy na Vercel (plano gratuito) a partir do push no GitHub.

**Rotas:**
1. `/`: busca com autocompletar, que ignora acento e maiúsculas e mostra a UF ao lado do nome. Destaques: os 5 maiores e os 5 menores `caged_saldo_12m_por_mil_hab`, com link para os rankings.
2. `/municipio/[cod]-[slug]`: pré-geradas no build para todos os municípios.
   - Cabeçalho (nome, UF, região) e botão "Comparar com…".
   - Cartões com `populacao`, `pib_per_capita`, `cempre_pessoal_ocupado` e `caged_saldo_12m`, cada um com a posição no Brasil e na UF.
   - Seções por tema: linha para as séries, barras para os recortes.
   - Fonte, período e data de carga embaixo de cada gráfico.
3. `/comparar?c=cod1,cod2,cod3`: carrega os perfis no cliente e mostra até 3 municípios.
   - Um gráfico sobreposto por indicador e uma tabela-resumo.
   - Por padrão mostra só os indicadores `relativo: true`; uma alternância exibe os absolutos.
   - O estado fica todo na URL.
4. `/rankings/[indicador]`: tabela ordenável, com filtro por UF e paginação de 50 linhas, tudo no cliente. Só existe para indicadores com `ranking: true`.
5. `/sobre`: fontes, metodologia, limitações (sigilo estatístico, defasagem do CEMPRE) e o conteúdo de `meta.json`.

**Componentes centrais:**
- `<Indicador id dados />` é genérico. Ele lê o catálogo e escolhe entre cartão, linha ou barras pela forma do dado. Um indicador novo não exige mudança nas telas.
- `<BuscaMunicipio />` é usado na home e no "Comparar com…".
- `lib/formatar.ts` concentra toda a formatação pt-BR (`1,3 mi`, `R$ 52,4 mil`, `3,2 SM`).
- `lib/normalizar.ts` faz a normalização de texto para a busca (sem acento, minúsculas).

## 5. Tratamento de erros

**Pipeline:**
- Downloads com timeout de 60 s e até 3 novas tentativas com espera exponencial.
- Fontes independentes: a falha de uma é registrada no log e não interrompe as outras. A exportação usa a última carga boa de cada fonte (tabela `cargas`), e `meta.json` traz a data real de cada uma.
- `validar.py` roda antes de exportar e aborta a exportação, com mensagem clara, se:
  - a quantidade de municípios em `municipios` diverge da API de localidades;
  - existe chave duplicada em `fatos` (`fonte, cod_municipio, indicador, periodo, recorte`);
  - a soma de `populacao` por UF diverge mais de 1% do total Brasil da mesma tabela;
  - o arquivo do CAGED não tem exatamente as colunas esperadas (layout mudou);
  - algum JSON exportado falha no JSON Schema.
- A conversão do código de 6 para 7 dígitos (CAGED → IBGE) acontece só em `fontes/caged.py`, usando `municipios.cod6`. Um código sem correspondência é registrado e descartado, e o total descartado aparece no log.

**Front:**
- Município inexistente: 404 com a busca.
- Indicador `null`: "Sem dado", seguido de `motivo_ausencia`.
- Código inválido em `/comparar`: o código é ignorado e um aviso discreto é exibido. Com mais de 3 códigos, valem os 3 primeiros.

## 6. Testes

**Pipeline (pytest, sem rede):**
- Cada fonte tem testes de parse e normalização sobre amostras gravadas em `tests/fixtures/`.
- Teste dedicado da conversão de 6 para 7 dígitos.
- Teste de `exportar.py` com uma tabela `fatos` mínima: o JSON resultante passa no schema, o `null` sai para dado ausente e as posições do ranking estão corretas.
- Testes de `validar.py`: cada checagem tem um caso que passa e um que falha.

**Front:**
- Vitest para `formatar.ts` e `normalizar.ts`.
- Um teste de ponta a ponta com Playwright: busca, perfil, "Comparar com…", página de comparação.

## 7. Atualização de dados

No MVP é manual: `uv run observatorio atualizar [--fonte <id>]` → JSONs atualizados → commit → push → deploy automático na Vercel.

## 8. Fora do escopo do MVP

Base CNPJ da Receita Federal (fase 2), mapas, login, exportação CSV/PDF, indicadores sociais (IDH, saúde, educação), atualização automática por GitHub Action e rankings com filtros livres (que exigiriam Parquet + DuckDB-WASM).
