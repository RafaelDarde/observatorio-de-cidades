import type { Metadata } from "next";
import { lerCatalogo, lerMeta } from "@/lib/dados";

export const metadata: Metadata = { title: "Sobre — Observatório Litoral Gaúcho" };

const NOMES_FONTES: Record<string, string> = {
  ibge_municipios: "IBGE — Lista de municípios (API de Localidades)",
  ibge_populacao: "IBGE — Estimativas de População e Censo 2022 (SIDRA 6579 e 4709)",
  ibge_pib: "IBGE — PIB dos Municípios (SIDRA 5938)",
  ibge_cempre: "IBGE — Cadastro Central de Empresas (SIDRA 9509 e 9510)",
  caged: "MTE — Novo CAGED, microdados de movimentação (CAGEDMOV)",
  ssp_rs: "SSP-RS — Indicadores Criminais e Violência contra a Mulher, por município",
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
          comparam só esses municípios entre si. Dados gerados em {dataHora(meta.gerado_em)}.
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
          O “último período” de cada indicador é o mais recente disponível entre os 16 municípios. Um município sem valor
          nesse período aparece como “sem dado no período mais recente”, mas o histórico continua no gráfico, e ele
          fica fora do ranking.
        </p>
        <p>
          Na comparação, o padrão são indicadores relativos (per capita, médias e taxas), porque comparar valores
          absolutos de cidades de tamanhos diferentes engana.
        </p>
        <div id="nota-seguranca" className="scroll-mt-20 space-y-3">
          <p>
            A <strong className="text-tinta">nota de segurança</strong> vai de 0 a 100: 50 é a média do Rio Grande do
            Sul e, quanto maior, mais segura a cidade. Ela segue o método do{" "}
            <a href="https://mapadecrimes.ia.br/metodologia" className="text-destaque underline">Índice Sentinel</a>{" "}
            (Mapa de Crimes) e do{" "}
            <a href="https://lp.soudapaz.org/iecv" className="text-destaque underline">IECV do Instituto Sou da Paz</a>:
          </p>
          <ol className="list-decimal space-y-1.5 pl-5">
            <li>
              Usa os <strong className="text-tinta">últimos 12 meses</strong> publicados pela SSP-RS e é recalculada a
              cada mês, o que forma o gráfico de evolução.
            </li>
            <li>
              Quatro tipos de crime, com pesos: mortes violentas 40%, estupro 20%, roubos 25% e furtos 15%. Crimes contra
              a vida pesam mais por serem os mais graves e os mais bem registrados.
            </li>
            <li>
              Para cada tipo, a taxa por habitante da cidade é dividida pela do RS no mesmo período. A razão entra em
              escala logarítmica (o dobro e a metade ficam à mesma distância da média) e é limitada a 4 vezes para cima
              ou para baixo, para que um único crime não domine a nota.
            </li>
            <li>
              <strong className="text-tinta">Suavização para cidades pequenas:</strong> soma-se a cada cidade o
              equivalente a 3 ocorrências na taxa média do RS. Assim, um único caso numa cidade de 5 mil habitantes não
              derruba a nota; em cidades grandes o efeito é desprezível.
            </li>
            <li>Nota = 50 − 50 × soma ponderada dos logaritmos, limitada entre 0 e 100. O dobro do RS em tudo dá 0; a metade dá 100.</li>
          </ol>
          <p>Faixas: 0–19 crítica; 20–39 risco alto; 40–59 moderada; 60–79 segura; 80–100 muito segura.</p>
          <p>
            <strong className="text-tinta">Ajuste de veraneio</strong> (inspirado no IECV Litoral): não há estimativa
            oficial da população de veraneio. Por isso, as ocorrências de dezembro a março são substituídas pelo ritmo dos
            outros oito meses, corrigido pela variação de verão do próprio RS. Sai só o aumento de verão que é específico
            da cidade. O ajuste nunca piora a nota e é mostrado ao lado da nota oficial, sem substituí-la.
          </p>
        </div>
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
          <li>Em municípios pequenos, poucos casos mudam muito a taxa. A nota usa suavização para reduzir esse efeito; as taxas anuais só incluem anos completos.</li>
          <li>Os estupros vêm dos indicadores de violência contra a mulher da SSP-RS e contam apenas vítimas mulheres (a grande maioria dos casos). É o crime com maior subnotificação: diferenças entre cidades podem refletir disposição a denunciar.</li>
        </ul>
      </section>
    </div>
  );
}
