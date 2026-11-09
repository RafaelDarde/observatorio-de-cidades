# Handoff: índice de violência v2

**Status (2026-11-08, noite): v2 aprovada pelo usuário e implementada na branch `violencia`** (escala 0–100
maior = mais seguro, ajuste de veraneio como segunda nota, histórico desde 2022, unidade "por 100 mil hab." e
"≈ 1 a cada X moradores" nas taxas). Nota mensal de 2022-12 a 2026-09. Implementação em
`pipeline/observatorio/seguranca.py`, `fontes/ssp_rs.py` (agora mensal + estupro) e `web/components/Termometro.tsx`.
Detalhe extra: o ajuste de veraneio só desconta (nunca piora a nota). Próximo passo: revisão do usuário na prévia
e merge em `main`. O texto abaixo é o registro da proposta.

Data: 2026-11-08. Branch: `violencia` (já no GitHub; prévia na Vercel em
https://observatorio-litoral-gaucho-git-violencia-rd-solucoes.vercel.app — exige login na Vercel).
Nada desta branch está em produção (`main`).

## Estado atual (v1, commitado na branch)

- Fonte `pipeline/observatorio/fontes/ssp_rs.py`: planilhas anuais da SSP-RS (2022+, só anos completos);
  carrega `seg_cvli`, `seg_roubos`, `seg_furtos`; total do RS vai para a tabela `referencias`.
- `ibge_populacao` também baixa a população do RS (`referencias`, indicador `populacao`).
- `derivados.py`: taxas por 100 mil (`seg_taxa_*`) e `seg_indice_violencia` = 100 × Σ peso × (taxa
  município / taxa RS), 3 últimos anos completos, pesos CVLI 50 / roubos 25 / furtos 25. Faixas
  <75 / 75–125 / 125–175 / 175+.
- Site: `components/Termometro.tsx`, `lib/violencia.ts`, tema `seguranca`, metodologia em `/sobre`.
- Resultado v1: Cidreira 334 … Tavares 41 (RS = 100).

## Proposta v2 (aguardando decisão do usuário)

Baseada no Mapa de Crimes (https://mapadecrimes.ia.br/metodologia) e no IECV do Sou da Paz
(relatório: https://www.acidadeon.com/wp-content/uploads/sites/3/2023/12/IECV.pdf).

1. **Estupro** entra: planilha "violência contra as mulheres" da SSP-RS
   (https://www.ssp.rs.gov.br/indicadores-da-violencia-contra-a-mulher), aba "Estupro", mensal por
   município (só vítimas mulheres — registrar a ressalva).
2. **Pesos:** vida (CVLI) 40%, estupro 20%, roubos 25%, furtos 15%.
3. **Escala log:** razão = taxa município / taxa RS em log2, limitada a ±2 (4×).
   Nota = 50 − 50 · Σ peso · log2(razão), limitada a 0–100. 50 = RS; maior = mais seguro.
4. **Suavização (cidades pequenas):** somar ao município, em cada dimensão, 3 ocorrências na taxa do RS
   (ocorrências + 3; população + 3 / taxa RS).
5. **Janela:** últimos 12 meses (abas mensais JAN..DEZ das planilhas da SSP-RS; o ano corrente parcial
   passa a ser lido). Nota recalculada mês a mês → gráfico de evolução desde 2023.
6. **Faixas (estilo Mapa de Crimes):** 80–100 muito segura, 60–79 segura, 40–59 moderada,
   20–39 risco alto, 0–19 crítica.
7. **Ajuste de veraneio (estilo IECV Litoral):** comparar média mensal dez–mar com o restante do ano e
   descontar o excesso do verão; mostrar como segunda nota.
8. **Termômetro:** nota principal + nota ajustada ao veraneio + barrinhas por dimensão.
9. Histórico de ocorrências/taxas anuais continua desde 2022.

## Decisões pendentes (com recomendação)

- Aprovar a v2 como acima? → recomendado: sim.
- Escala: (a) 0–100, maior = mais seguro, 50 = RS; (b) manter RS = 100, maior = mais violento → (a).
- Ajuste de veraneio: (a) segunda nota; (b) nota principal; (c) depois → (a).
- Histórico a partir de 2022? → sim.
- Também proposto antes: mostrar a unidade "por 100 mil hab." ao lado do número das taxas e a frase
  "≈ 1 a cada X moradores" (o usuário confundiu 94,6 com porcentagem) → recomendado: sim.

## Outros pontos do projeto

- Atualização semanal: tarefa "Observatorio Litoral - atualizar dados" no Agendador do Windows
  (segunda 9h), `scripts/atualizar-dados.ps1`, log em `_scratch/atualizacao.log`. GitHub Actions não
  funciona (IBGE bloqueia IPs de fora do Brasil).
- Produção: https://observatorio-litoral-gaucho.vercel.app (branch `main`).
- Antes de publicar a violência em produção: merge de `violencia` em `main` (regerar os JSONs se a tarefa
  semanal tiver commitado dados novos em `main` nesse meio-tempo).
