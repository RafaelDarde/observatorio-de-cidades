import Link from "next/link";
import { FitaPosicao } from "@/components/Indicador";
import type { Indicador as DadosIndicador } from "@/lib/tipos";
import { ESCALA_MAX, FAIXAS, faixaDoIndice, frasePosicaoRS } from "@/lib/violencia";

const pct = (v: number) => `${(Math.min(Math.max(v, 0), ESCALA_MAX) / ESCALA_MAX) * 100}%`;

// Termômetro do índice de violência: régua 0–250 com as quatro faixas e a marca do município.
export function Termometro({ dados }: { dados: DadosIndicador | null }) {
  const ultimo = dados?.ultimo;
  if (!ultimo) return null;
  const faixa = faixaDoIndice(ultimo.valor);
  const anoFim = Number(ultimo.periodo);

  return (
    <article className="cartao p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold">Termômetro da violência</h3>
          <p className="mt-1 text-sm text-suave">
            Média de {anoFim - 2} a {anoFim}, comparada ao Rio Grande do Sul (RS = 100)
          </p>
        </div>
        <div className="text-right">
          <p className="titulo text-4xl font-semibold tabular-nums">{Math.round(ultimo.valor)}</p>
          <p className="text-sm font-semibold" style={{ color: faixa.cor }}>Violência {faixa.rotulo.toLowerCase()}</p>
        </div>
      </div>

      <div
        className="relative mt-6"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={ESCALA_MAX}
        aria-valuenow={Math.round(ultimo.valor)}
        aria-valuetext={`${Math.round(ultimo.valor)}: violência ${faixa.rotulo.toLowerCase()}, ${frasePosicaoRS(ultimo.valor)}`}
        aria-label="Índice de violência"
      >
        <div className="flex h-3 overflow-hidden rounded-full">
          {FAIXAS.map((f, i) => {
            const inicio = i === 0 ? 0 : FAIXAS[i - 1].ate;
            const fim = Math.min(f.ate, ESCALA_MAX);
            return (
              <span
                key={f.id}
                className={f.id === faixa.id ? "" : "opacity-35"}
                style={{ width: `${((fim - inicio) / ESCALA_MAX) * 100}%`, backgroundColor: f.cor }}
              />
            );
          })}
        </div>
        <span
          className="absolute -top-1.5 h-6 w-1.5 -translate-x-1/2 rounded-full bg-tinta ring-2 ring-cartao"
          style={{ left: pct(ultimo.valor) }}
          aria-hidden="true"
        />
        <div className="relative mt-1.5 h-4 text-[11px] text-suave" aria-hidden="true">
          <span className="absolute -translate-x-1/2" style={{ left: pct(100) }}>RS 100</span>
          <span className="absolute right-0">{ESCALA_MAX}+</span>
          <span className="absolute left-0">0</span>
        </div>
      </div>

      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-suave" aria-label="Faixas">
        {FAIXAS.map((f, i) => (
          <li key={f.id} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: f.cor }} aria-hidden="true" />
            {f.rotulo} ({i === 0 ? `< ${f.ate}` : f.ate === Infinity ? `${FAIXAS[i - 1].ate}+` : `${FAIXAS[i - 1].ate}–${f.ate}`})
          </li>
        ))}
      </ul>

      <p className="mt-4 text-sm leading-relaxed">
        As taxas de crimes de {anoFim - 2} a {anoFim} ficam em <strong>{frasePosicaoRS(ultimo.valor)}</strong>.
        Mortes violentas pesam 50% do índice; roubos e furtos, 25% cada.
      </p>
      {dados?.posicao && (
        <div className="mt-3 max-w-xs">
          <FitaPosicao posicao={dados.posicao} />
          <p className="mt-0.5 text-xs text-suave">Nº 1 = mais violento</p>
        </div>
      )}
      <p className="mt-4 border-t border-linha pt-3 text-xs text-suave">
        Fonte: SSP-RS e IBGE · Ocorrências registradas; no veraneio a população real é maior que a residente, o que
        infla as taxas das cidades balneárias.{" "}
        <Link href="/sobre#indice-violencia" className="font-medium text-destaque hover:underline">Como é calculado</Link>
      </p>
    </article>
  );
}
