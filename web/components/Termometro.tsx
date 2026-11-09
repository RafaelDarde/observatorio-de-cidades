import Link from "next/link";
import { GraficoLinha } from "@/components/Graficos";
import { FitaPosicao } from "@/components/Indicador";
import type { Indicador as DadosIndicador } from "@/lib/tipos";
import { FAIXAS, MEDIA_RS, faixaDaNota, fraseComparacaoRS, inicioJanela, mesCurto } from "@/lib/violencia";

const ORDEM_DIMENSOES = ["Mortes violentas", "Estupro", "Roubos", "Furtos"];
const PESOS: Record<string, string> = { "Mortes violentas": "40%", Estupro: "20%", Roubos: "25%", Furtos: "15%" };

function Regua({ nota, veraneio }: { nota: number; veraneio: number | null }) {
  return (
    <div className="relative">
      <div className="flex h-3 overflow-hidden rounded-full" aria-hidden="true">
        {FAIXAS.map((f) => (
          <span key={f.id} className={faixaDaNota(nota).id === f.id ? "" : "opacity-35"}
                style={{ width: "20%", backgroundColor: f.cor }} />
        ))}
      </div>
      {veraneio !== null && Math.round(veraneio) !== Math.round(nota) && (
        <span className="absolute -top-1 h-5 w-3 -translate-x-1/2 rounded-full border-2 border-tinta bg-cartao"
              style={{ left: `${veraneio}%` }} title="Ajustada ao veraneio" aria-hidden="true" />
      )}
      <span className="absolute -top-1.5 h-6 w-1.5 -translate-x-1/2 rounded-full bg-tinta ring-2 ring-cartao"
            style={{ left: `${nota}%` }} aria-hidden="true" />
      <div className="relative mt-1.5 h-4 text-[11px] text-suave" aria-hidden="true">
        <span className="absolute left-0">0 · menos seguro</span>
        <span className="absolute -translate-x-1/2" style={{ left: `${MEDIA_RS}%` }}>RS 50</span>
        <span className="absolute right-0">mais seguro · 100</span>
      </div>
    </div>
  );
}

function Dimensao({ rotulo, valor }: { rotulo: string; valor: number }) {
  const faixa = faixaDaNota(valor);
  return (
    <li>
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span>{rotulo} <span className="text-xs text-suave">({PESOS[rotulo]})</span></span>
        <span className="font-semibold tabular-nums" style={{ color: faixa.cor }}>{Math.round(valor)}</span>
      </div>
      <div className="relative mt-1 h-1.5 rounded-full bg-linha" aria-hidden="true">
        <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${valor}%`, backgroundColor: faixa.cor }} />
        <span className="absolute -top-0.5 h-2.5 w-px bg-suave" style={{ left: `${MEDIA_RS}%` }} />
      </div>
    </li>
  );
}

// Termômetro da nota de segurança: régua 0–100 (50 = RS), nota ajustada ao veraneio, composição e evolução.
export function Termometro({ nota, veraneio }: { nota: DadosIndicador | null; veraneio: DadosIndicador | null }) {
  const ultimo = nota?.ultimo;
  if (!ultimo) return null;
  const faixa = faixaDaNota(ultimo.valor);
  const ajustada = veraneio?.ultimo?.periodo === ultimo.periodo ? veraneio.ultimo.valor : null;
  const janela = `${mesCurto(inicioJanela(ultimo.periodo))} a ${mesCurto(ultimo.periodo)}`;
  // Série mensal contínua: o 13º ponto a partir do fim é a nota de 12 meses antes.
  const doze = nota!.serie.at(-13);
  const variacao = doze ? Math.round(ultimo.valor) - Math.round(doze.valor) : null;
  const dimensoes = [...(nota!.por_recorte ?? [])].sort(
    (a, b) => ORDEM_DIMENSOES.indexOf(a.recorte) - ORDEM_DIMENSOES.indexOf(b.recorte),
  );

  return (
    <article className="cartao p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold">Nota de segurança</h3>
          <p className="mt-1 text-sm text-suave">Últimos 12 meses ({janela}) · 0 a 100, em que 50 = média do RS</p>
        </div>
        <div className="text-right">
          <p className="titulo text-4xl font-semibold tabular-nums">{Math.round(ultimo.valor)}</p>
          <p className="text-sm font-semibold" style={{ color: faixa.cor }}>{faixa.rotulo}</p>
        </div>
      </div>

      <div
        className="mt-6"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(ultimo.valor)}
        aria-valuetext={`${Math.round(ultimo.valor)} de 100: ${faixa.rotulo}, ${fraseComparacaoRS(ultimo.valor)}`}
        aria-label="Nota de segurança"
      >
        <Regua nota={ultimo.valor} veraneio={ajustada} />
      </div>

      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-suave" aria-label="Faixas">
        {FAIXAS.map((f, i) => (
          <li key={f.id} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: f.cor }} aria-hidden="true" />
            {f.rotulo} ({f.de}–{i === FAIXAS.length - 1 ? 100 : FAIXAS[i + 1].de - 1})
          </li>
        ))}
      </ul>

      <p className="mt-4 text-sm leading-relaxed">
        A cidade está <strong>{fraseComparacaoRS(ultimo.valor)}</strong>.
        {variacao !== null && (
          <> Em relação a 12 meses antes, a nota {variacao === 0 ? "ficou igual" : `${variacao > 0 ? "subiu" : "caiu"} ${Math.abs(variacao)} ${Math.abs(variacao) === 1 ? "ponto" : "pontos"}`}.</>
        )}
      </p>

      {ajustada !== null && (
        <div className="mt-4 flex items-start gap-3 rounded-xl bg-papel p-3 text-sm">
          <span className="mt-1 h-4 w-2.5 shrink-0 rounded-full border-2 border-tinta bg-cartao" aria-hidden="true" />
          <p>
            <strong>Ajustada ao veraneio: {Math.round(ajustada)}</strong> ({faixaDaNota(ajustada).rotulo.toLowerCase()}).{" "}
            <span className="text-suave">
              {Math.round(ajustada) > Math.round(ultimo.valor)
                ? "Desconta o aumento de ocorrências de dezembro a março que vai além do que acontece no RS no mesmo período, efeito provável dos veranistas."
                : "O verão desta cidade não tem aumento de ocorrências acima do que acontece no RS; o ajuste não muda a nota."}
            </span>
          </p>
        </div>
      )}

      <div className="mt-5 grid gap-6 md:grid-cols-2">
        {dimensoes.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold">O que compõe a nota</h4>
            <p className="mb-3 text-xs text-suave">Nota de cada tipo de crime (peso entre parênteses); o traço marca a média do RS</p>
            <ul className="space-y-3">
              {dimensoes.map((d) => <Dimensao key={d.recorte} rotulo={d.recorte} valor={d.valor} />)}
            </ul>
          </div>
        )}
        {nota!.serie.length >= 2 && (
          <div>
            <h4 className="text-sm font-semibold">Evolução</h4>
            <p className="mb-1 text-xs text-suave">Cada ponto é a nota dos 12 meses até aquele mês</p>
            <GraficoLinha serie={nota!.serie} unidade="nota" dominio={[0, 100]} referencia={{ y: MEDIA_RS, rotulo: "RS" }} />
          </div>
        )}
      </div>

      {nota!.posicao && (
        <div className="mt-4 max-w-xs">
          <FitaPosicao posicao={nota!.posicao} />
          <p className="mt-0.5 text-xs text-suave">Nº 1 = mais seguro</p>
        </div>
      )}
      <p className="mt-4 border-t border-linha pt-3 text-xs text-suave">
        Fonte: SSP-RS e IBGE · Ocorrências registradas pela polícia, comparadas às taxas do RS no mesmo período.{" "}
        <Link href="/sobre#nota-seguranca" className="font-medium text-destaque hover:underline">Como é calculada</Link>
      </p>
    </article>
  );
}
