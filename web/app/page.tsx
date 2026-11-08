import Link from "next/link";
import { BuscaMunicipio } from "@/components/BuscaMunicipio";
import { Contador } from "@/components/Contador";
import { PainelMapa, type IndicadorPainel } from "@/components/PainelMapa";
import { lerCatalogo, lerIndice, lerRanking } from "@/lib/dados";
import { formatarValor } from "@/lib/formatar";
import { idMunicipio } from "@/lib/normalizar";
import type { Ranking } from "@/lib/tipos";

const PAINEL: { id: string; curto: string }[] = [
  { id: "populacao", curto: "População" },
  { id: "pib_per_capita", curto: "PIB por habitante" },
  { id: "caged_saldo_12m_por_mil_hab", curto: "Empregos criados" },
  { id: "cempre_salario_medio_sm", curto: "Salário médio" },
  { id: "populacao_var_censo", curto: "Crescimento" },
];
const SUGESTOES = ["Torres", "Tramandaí", "Capão da Canoa", "Xangri-lá"];

const soma = (r: Ranking) => r.reduce((t, l) => t + l.valor, 0);

function Lista({ titulo, itens, unidade }: { titulo: string; itens: Ranking; unidade: string }) {
  const maximo = Math.max(...itens.map((m) => Math.abs(m.valor)));
  return (
    <div className="cartao p-5">
      <h3 className="mb-4 text-base font-semibold">{titulo}</h3>
      <ol className="space-y-3">
        {itens.map((m) => (
          <li key={m.cod}>
            <Link href={`/municipio/${idMunicipio(m.cod, m.nome)}`} className="group block">
              <span className="flex items-baseline justify-between gap-3 text-sm">
                <span className="font-medium group-hover:text-destaque">{m.nome}</span>
                <span className={`font-semibold tabular-nums ${m.valor < 0 ? "text-negativo" : "text-positivo"}`}>
                  {formatarValor(m.valor, unidade)}
                </span>
              </span>
              <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-papel">
                <span
                  className={`barra-cresce block h-full rounded-full ${m.valor < 0 ? "bg-negativo/70" : "bg-destaque"}`}
                  style={{ width: `${Math.max(3, (Math.abs(m.valor) / maximo) * 100)}%` }}
                />
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default function Inicio() {
  const catalogo = lerCatalogo();
  const porId = Object.fromEntries(catalogo.map((c) => [c.id, c]));
  const indice = lerIndice();

  const painel: IndicadorPainel[] = PAINEL.filter((p) => porId[p.id]).map((p) => ({
    id: p.id,
    curto: p.curto,
    nome: porId[p.id].nome,
    descricao: porId[p.id].descricao,
    unidade: porId[p.id].unidade,
    periodo: porId[p.id].periodo_max,
    fonte: porId[p.id].fonte,
    linhas: lerRanking(p.id),
  }));

  const kpis = [
    { rotulo: "moradores", valor: soma(lerRanking("populacao")), unidade: "pessoas", nota: `estimativa ${porId.populacao.periodo_max}` },
    { rotulo: "de riqueza gerada por ano", valor: soma(lerRanking("pib")), unidade: "R$ mil", nota: `PIB de ${porId.pib.periodo_max}` },
    { rotulo: `cidades com mais empregos formais do que há 12 meses`, texto: `${lerRanking("caged_saldo_12m").filter((l) => l.valor > 0).length} de 16`, nota: `saldo até ${porId.caged_saldo_12m.periodo_max}` },
  ];

  const porMil = lerRanking("caged_saldo_12m_por_mil_hab");
  const itemSaldo = porId.caged_saldo_12m_por_mil_hab;
  const sugestoes = SUGESTOES.map((n) => indice.find((m) => m.nome === n)).filter((m) => !!m);

  return (
    <div className="space-y-8">
      <section className="relative rounded-3xl bg-gradient-to-br from-mare via-mare to-mare-2 text-white shadow-[0_20px_40px_-24px_rgb(10_42_61/0.7)]">
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl" aria-hidden="true">
          <svg className="absolute -bottom-px left-0 w-full" viewBox="0 0 1200 120" preserveAspectRatio="none" height="90">
            <path d="M0 70q150-50 300 0t300 0t300 0t300 0V120H0z" fill="#fff" fillOpacity=".05" />
            <path d="M0 90q150-40 300 0t300 0t300 0t300 0V120H0z" fill="#fff" fillOpacity=".06" />
          </svg>
          <div className="farol-brilho absolute inset-0 bg-[radial-gradient(circle_at_88%_0%,rgba(127,208,216,0.28),transparent_50%)]" />
        </div>

        <div className="relative grid gap-8 px-6 py-9 sm:px-10 sm:py-12 lg:grid-cols-[1fr_17rem]">
          <div>
          <h1 className="max-w-2xl text-4xl font-semibold leading-[1.05] sm:text-5xl">O litoral gaúcho em números</h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-white/75">
            População, economia, empresas e emprego dos 16 municípios do litoral gaúcho, de Torres a Santa Vitória do
            Palmar. Escolha uma cidade para começar.
          </p>

          <div className="mt-6 max-w-xl">
            <BuscaMunicipio autoFocus variante="hero" placeholder="Digite o nome de uma cidade…" />
            <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-white/65">
              Comece por
              {sugestoes.map((m) => (
                <Link
                  key={m.cod}
                  href={`/municipio/${idMunicipio(m.cod, m.nome)}`}
                  className="rounded-full bg-white/10 px-3 py-1 text-white transition-colors hover:bg-white/20"
                >
                  {m.nome}
                </Link>
              ))}
            </p>
          </div>

          </div>

          <dl className="space-y-5 border-white/15 lg:border-l lg:pl-8">
            {kpis.map((k) => (
              <div key={k.rotulo}>
                <dd>
                  <span className="titulo block text-4xl font-semibold text-white">
                    {"texto" in k ? k.texto : <Contador valor={k.valor!} unidade={k.unidade!} />}
                  </span>
                  <span className="mt-1 block text-sm text-white/75">{k.rotulo}</span>
                  <span className="block text-xs text-white/45">{k.nota}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <PainelMapa indicadores={painel} />

      <section className="space-y-4" aria-labelledby="titulo-empregos">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 id="titulo-empregos" className="text-xl font-semibold">Onde o emprego formal mais cresce</h2>
            <p className="mt-1 text-sm text-suave">
              Saldo de empregos nos últimos 12 meses para cada mil habitantes, até {itemSaldo.periodo_max}.
            </p>
          </div>
          <Link href={`/rankings/${itemSaldo.id}`} className="text-sm font-medium text-destaque hover:underline">
            Ver ranking completo
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Lista titulo="Mais empregos por habitante" itens={porMil.slice(0, 5)} unidade={itemSaldo.unidade} />
          <Lista titulo="Menos empregos por habitante" itens={porMil.slice(-5).reverse()} unidade={itemSaldo.unidade} />
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <Link href="/comparar" prefetch={false} className="cartao group flex items-center justify-between gap-4 p-5 transition-colors hover:border-destaque">
          <span>
            <span className="titulo block text-lg font-semibold">Compare até três cidades</span>
            <span className="mt-1 block text-sm text-suave">Veja lado a lado população, renda, empresas e empregos.</span>
          </span>
          <span aria-hidden="true" className="text-2xl text-destaque transition-transform group-hover:translate-x-1">→</span>
        </Link>
        <Link href="/rankings" prefetch={false} className="cartao group flex items-center justify-between gap-4 p-5 transition-colors hover:border-destaque">
          <span>
            <span className="titulo block text-lg font-semibold">Todos os rankings</span>
            <span className="mt-1 block text-sm text-suave">Qual cidade lidera em cada indicador, do maior ao menor.</span>
          </span>
          <span aria-hidden="true" className="text-2xl text-destaque transition-transform group-hover:translate-x-1">→</span>
        </Link>
      </section>
    </div>
  );
}
