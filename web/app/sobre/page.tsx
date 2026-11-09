import type { Metadata } from "next";
import { lerCatalogo, lerMeta } from "@/lib/dados";

export const metadata: Metadata = { title: "Sobre — Observatório Litoral Gaúcho" };

const NOMES_FONTES: Record<string, string> = {
  ibge_municipios: "IBGE — Lista de municípios (API de Localidades)",
  ibge_populacao: "IBGE — Estimativas de População e Censo 2022 (SIDRA 6579 e 4709)",
  ibge_pib: "IBGE — PIB dos Municípios (SIDRA 5938)",
  ibge_cempre: "IBGE — Cadastro Central de Empresas (SIDRA 9509 e 9510)",
  caged: "MTE — Novo CAGED, microdados de movimentação (CAGEDMOV)",
  ssp_rs: "SSP-RS — Indicadores Criminais por município (fato consumado)",
  derivado: "Indicadores calculados pelo Observatório",
};

const dataHora = (iso: string) => new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

export default function PaginaSobre() {
  const catalogo = lerCatalogo();
  const meta = lerMeta();
  return (
    <div className="max-w-3xl space-y-6">
      <section className="space-y-3">
        <h1 className="text-3xl font-semibold sm:text-4xl">Sobre o Observatório</h1>
        <p className="leading-relaxed text-suave">
          Projeto de estudo que reúne dados públicos e gratuitos sobre os 16 municípios do litoral do Rio Grande do Sul
          — os municípios gaúchos defrontantes com o mar, pela lista oficial do IBGE (2024). Rankings e posições
          comparam só esses municípios entre si. Um pipeline em
          Python baixa as fontes oficiais, organiza tudo num banco DuckDB e gera os arquivos que este site estático
          exibe. Dados gerados em {dataHora(meta.gerado_em)}.
        </p>
      </section>

      <section className="cartao space-y-3 overflow-x-auto p-5">
        <h2 className="text-xl font-semibold">Fontes</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-linha text-left text-suave">
              <th className="py-2 pr-4 font-medium">Fonte</th>
              <th className="py-2 pr-4 font-medium">Período</th>
              <th className="py-2 font-medium">Carregado em</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(meta.fontes).map(([id, f]) => (
              <tr key={id} className="border-b border-linha">
                <td className="py-2 pr-4">{NOMES_FONTES[id] ?? id}</td>
                <td className="py-2 pr-4 tabular-nums">{f.periodo_min ?? "—"} a {f.periodo_max ?? "—"}</td>
                <td className="py-2 tabular-nums">{dataHora(f.carregado_em)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="cartao space-y-3 p-5">
        <h2 className="text-xl font-semibold">Indicadores</h2>
        <dl className="space-y-4 text-sm">
          {catalogo.map((c) => (
            <div key={c.id}>
              <dt className="font-medium">{c.nome}</dt>
              <dd className="text-suave">{c.descricao}</dd>
              <dd className="text-xs text-suave">{c.fonte} · {c.periodo_min ?? "—"} a {c.periodo_max ?? "—"}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="cartao space-y-3 p-5 text-sm leading-relaxed text-suave">
        <h2 className="text-xl font-semibold text-tinta">Metodologia</h2>
        <p>
          Todas as fontes são normalizadas numa única tabela em formato longo (município, indicador, período,
          recorte, valor). Assim, uma fonte nova entra como um módulo novo no pipeline, sem mudar o site.
        </p>
        <p>
          O “último período” de cada indicador é o mais recente disponível entre os 16 municípios. Um município sem valor
          nesse período aparece como “sem dado no período mais recente”, mas o histórico continua no gráfico, e ele
          fica fora do ranking.
        </p>
        <p>
          Na comparação, o padrão são indicadores relativos (per capita, médias e taxas), porque comparar valores
          absolutos de cidades de tamanhos diferentes engana.
        </p>
        <p id="indice-violencia">
          O <strong className="text-tinta">índice de violência</strong> compara cada município com o Rio Grande do Sul.
          Para mortes violentas (CVLI), roubos e furtos, calcula-se a taxa por 100 mil habitantes somando os últimos 3
          anos completos, e divide-se pela taxa do RS no mesmo período. As três razões entram com pesos de 50%, 25% e
          25% (mortes violentas pesam mais por serem o registro mais confiável) e o resultado é multiplicado por 100.
          Assim, 100 significa “igual ao RS” e 200, “o dobro”. As faixas do termômetro são: abaixo de 75, baixa; de 75
          a 125, moderada (próxima do RS); de 125 a 175, alta; 175 ou mais, muito alta.
        </p>
      </section>

      <section className="cartao space-y-3 p-5 text-sm leading-relaxed text-suave">
        <h2 className="text-xl font-semibold text-tinta">Limitações</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>O CEMPRE tem defasagem de cerca de dois anos. A quebra por setor só é publicada para parte dos municípios, e há valores omitidos por sigilo estatístico.</li>
          <li>O valor adicionado por setor do PIB municipal só está publicado até 2021, enquanto o PIB total vai até o ano mais recente.</li>
          <li>O PIB per capita é calculado aqui: PIB dividido pela população do mesmo ano. Para anos sem estimativa populacional, usa-se a média dos anos vizinhos.</li>
          <li>O saldo de empregos usa apenas o arquivo CAGEDMOV (declarações no prazo), sem ajustes de declarações fora do prazo e exclusões. Pode diferir levemente do número oficial divulgado.</li>
          <li>O CAGED identifica municípios com 6 dígitos. A conversão para o código IBGE de 7 dígitos usa a lista oficial; movimentações sem correspondência são descartadas.</li>
          <li>Os dados de segurança são ocorrências registradas pela polícia: crimes não comunicados (subnotificação, mais comum em furtos) ficam de fora. Mortes violentas são o indicador mais confiável.</li>
          <li>As taxas de segurança usam a população residente. No litoral, o veraneio multiplica a população no verão, e parte das ocorrências envolve visitantes; por isso as taxas de cidades balneárias tendem a parecer mais altas do que o risco real de quem mora lá.</li>
          <li>Em municípios pequenos, poucos casos mudam muito a taxa de um ano para outro. O índice usa 3 anos somados para reduzir esse efeito. O ano corrente, ainda incompleto, não entra.</li>
        </ul>
      </section>
    </div>
  );
}
