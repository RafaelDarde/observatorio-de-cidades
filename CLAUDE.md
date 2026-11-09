# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Leitura obrigatória no início de toda sessão

Toda sessão nova, antes de qualquer tarefa, deve:

1. Ler este arquivo inteiro.
2. Ler os arquivos de passagem em `docs/*-handoff.md` que não estejam marcados como CONCLUÍDO (estado do trabalho em andamento, decisões já tomadas e pendentes). Hoje: nenhum em andamento.
3. Conferir `git status` e `git branch` para saber em que branch está e o que não foi commitado.
4. Ao encerrar uma sessão com trabalho pela metade, atualizar (ou criar) o `docs/<assunto>-handoff.md` correspondente e citá-lo no item 2.

## Visão geral

Observatório Litoral Gaúcho (repositório `observatorio-de-cidades`): dados públicos dos 16 municípios do litoral do RS — população, economia, empresas, emprego e segurança. Dois blocos ligados por arquivos JSON:

- `pipeline/` (Python, gerenciado com `uv`): baixa as fontes, grava em DuckDB, calcula derivados, valida e exporta JSONs.
- `web/` (Next.js, `output: "export"`): site 100% estático que lê os JSONs de `web/public/dados/`. Sem servidor.

Specs e planos de design ficam em `docs/superpowers/`.

## Comandos

Pipeline (rodar em `pipeline/`):
```
uv sync
uv run observatorio atualizar                  # todas as fontes: baixa → carrega → deriva → valida → exporta
uv run observatorio atualizar --fonte ibge_pib # só uma fonte (ids em FONTES, pipeline/observatorio/cli.py)
uv run pytest                                  # testes
uv run pytest tests/test_recorte.py::nome_do_teste   # um teste
```

Web (rodar em `web/`):
```
npm run dev
npm run build        # gera out/
npm run lint
npm test             # vitest run
npx vitest run lib/formatar.test.ts   # um arquivo
npx playwright test  # e2e; serve out/ na porta 3123, então rode npm run build antes
npm run tipos        # regenera lib/tipos.ts a partir de schema/dados.schema.json
```

## Arquitetura

Fluxo: `fontes/*.py` → tabela `fatos` no `observatorio.duckdb` (raiz, gitignored) → `derivados.py` → `validar.py` → `exportar.py` → `web/public/dados/` (JSONs por município, rankings, `municipios.json`, `meta.json`).

- **Cada fonte** (`pipeline/observatorio/fontes/`) expõe `baixar()` e `carregar(con)`. Registrar nova fonte no dicionário `FONTES` de `cli.py`. `ibge_municipios` é pré-requisito das demais: se vier vazia, a atualização aborta.
- **Falha de fonte não derruba tudo**: erro em uma fonte mantém a última carga boa. `banco.substituir_fatos` rejeita carga nova com menos de 50% das linhas da anterior (`CargaSuspeita`).
- **Exportação só ocorre se `validar` passar**; erros de validação cancelam a exportação.
- **Cache**: `_cache/<fonte>/<data>/`, válido por um dia. Fontes SIDRA usam `cache_do_recorte`, que inclui hash da lista de municípios, então trocar o recorte não reaproveita respostas antigas.
- **Catálogo de indicadores**: `pipeline/observatorio/indicadores.yaml` é a fonte única de nomes, unidades, descrições e flags (`ranking`, `relativo`, `tema`). O site consome esses metadados via JSON.
- **Contrato pipeline↔web**: `schema/dados.schema.json` valida os JSONs exportados; `web/lib/tipos.ts` é **gerado** dele (não editar à mão, usar `npm run tipos`). Mudou o schema, regenere os tipos.
- **Tabela `referencias`** (indicador, periodo, valor): valores de referência que não são de um município, como a população do RS e os totais mensais de crimes do RS (`seg_*_mes`). Base das taxas estaduais.
- **Segurança**: `fontes/ssp_rs.py` lê das páginas da SSP-RS os links das planilhas anuais (Indicadores Criminais e Violência contra a Mulher; o site exige User-Agent de navegador e tem links quebrados, por isso tenta o próximo). Grava fatos mensais `seg_*_mes` e anuais `seg_*` (só anos completos). `seguranca.py` calcula a nota de segurança (0–100, 50 = RS, maior = mais seguro; janela de 12 meses, suavização para cidades pequenas, log2 limitado a 4×, pesos CVLI 40 / estupro 20 / roubos 25 / furtos 15) e a nota ajustada ao veraneio; a metodologia para o público está em `web/app/sobre/page.tsx`.
- **Recorte territorial**: a lista de municípios está em `pipeline/observatorio/recorte.yaml` (códigos IBGE de 7 dígitos). Trocar a região exige também atualizar os textos fixos "litoral" em `web/app/page.tsx`, `layout.tsx` e `sobre/page.tsx`, e o e2e `web/e2e/fluxo.spec.ts` (espera 16 municípios).

## Atualização de dados e deploy

- Produção: https://observatorio-litoral-gaucho.vercel.app (Vercel, Root Directory `web`), publicada a cada push em `main` do GitHub `RafaelDarde/observatorio-de-cidades`. Branches ganham prévia automática na Vercel (exige login): `https://observatorio-litoral-gaucho-git-<branch>-rd-solucoes.vercel.app`.
- `scripts/atualizar-dados.ps1` roda semanalmente pelo Agendador de Tarefas do Windows. Usa uma worktree separada em `_atualizacao/` (gitignored), roda o pipeline, e se os JSONs mudaram (ignorando `meta.json`) commita e dá push em `main`; a Vercel publica sozinha. Precisa rodar no Brasil: as APIs do IBGE e o FTP do CAGED recusam conexões de fora, por isso não usa GitHub Actions.

## Atenção

- `web/AGENTS.md` avisa que esta versão do Next.js (16.x) tem mudanças incompatíveis: consulte `web/node_modules/next/dist/docs/` antes de escrever código Next.
- Arquivos temporários vão em `_scratch/` (gitignored).
- Mudou um indicador? Atualize juntos: `indicadores.yaml`, `catalogo.py` (unidades/temas válidos), `schema/dados.schema.json` (enums), `npm run tipos`, `web/lib/formatar.ts` (unidade nova) e `web/lib/visualizacao.ts` (`fonteDoIndicador`).
