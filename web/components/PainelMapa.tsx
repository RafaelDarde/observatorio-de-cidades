"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { MapaLitoral, type ValorMapa } from "@/components/MapaLitoral";
import { formatarValor } from "@/lib/formatar";
import { corDoValor } from "@/lib/mapa";
import { idMunicipio } from "@/lib/normalizar";
import type { Ranking } from "@/lib/tipos";

export type IndicadorPainel = {
  id: string;
  curto: string;
  nome: string;
  descricao: string;
  unidade: string;
  periodo: string | null;
  fonte: string;
  linhas: Ranking;
};

export function PainelMapa({ indicadores }: { indicadores: IndicadorPainel[] }) {
  const [id, setId] = useState(indicadores[0].id);
  const [ativo, setAtivo] = useState<string | null>(null);
  const atual = indicadores.find((i) => i.id === id)!;

  const { valores, min, max, maxAbs } = useMemo(() => {
    const v: Record<string, ValorMapa> = {};
    for (const l of atual.linhas)
      v[l.cod] = { nome: l.nome, valor: l.valor, texto: formatarValor(l.valor, atual.unidade), posicao: l.posicao, total: atual.linhas.length };
    const nums = atual.linhas.map((l) => l.valor);
    return { valores: v, min: Math.min(...nums), max: Math.max(...nums), maxAbs: Math.max(...nums.map(Math.abs)) };
  }, [atual]);

  return (
    <section className="cartao overflow-hidden" aria-labelledby="titulo-painel">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-linha px-5 py-4 sm:px-6">
        <div className="max-w-xl">
          <h2 id="titulo-painel" className="text-xl font-semibold">{atual.nome}</h2>
          <p className="mt-1 text-sm leading-relaxed text-suave">{atual.descricao}</p>
        </div>
        <div role="tablist" aria-label="Indicador no mapa" className="flex flex-wrap gap-1.5">
          {indicadores.map((i) => (
            <button
              key={i.id}
              role="tab"
              type="button"
              aria-selected={i.id === id}
              onClick={() => setId(i.id)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                i.id === id ? "bg-mare text-white" : "bg-papel text-suave hover:bg-espuma hover:text-tinta"
              }`}
            >
              {i.curto}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="mx-auto w-full max-w-[560px]">
          <MapaLitoral valores={valores} min={min} max={max} ativo={ativo} aoAtivar={setAtivo} />
          <div className="mt-3">
            <div
              className="h-2 rounded-full"
              style={{
                background: `linear-gradient(90deg, ${min < 0 ? corDoValor(min, min, max) + ", " : ""}${corDoValor(min < 0 ? 0 : min, min, max)}, ${corDoValor(max, min, max)})`,
              }}
            />
            <div className="mt-1 flex justify-between text-xs text-suave">
              <span>{formatarValor(min, atual.unidade)}</span>
              <span>{formatarValor(max, atual.unidade)}</span>
            </div>
          </div>
        </div>

        <div className="min-w-0">
          <ol className="space-y-1" key={atual.id}>
            {atual.linhas.map((l, i) => {
              const pct = Math.max(2, (Math.abs(l.valor) / maxAbs) * 100);
              const em = ativo === l.cod;
              return (
                <li key={l.cod}>
                  <Link
                    href={`/municipio/${idMunicipio(l.cod, l.nome)}`}
                    onMouseEnter={() => setAtivo(l.cod)}
                    onMouseLeave={() => setAtivo(null)}
                    onFocus={() => setAtivo(l.cod)}
                    onBlur={() => setAtivo(null)}
                    className={`grid grid-cols-[1.5rem_minmax(0,9.5rem)_1fr_auto] items-center gap-3 rounded-lg px-2 py-1.5 text-sm transition-colors ${
                      em ? "bg-espuma" : "hover:bg-papel"
                    }`}
                  >
                    <span className="text-right text-xs tabular-nums text-suave">{i + 1}</span>
                    <span className="truncate font-medium">{l.nome}</span>
                    <span className="h-2.5 overflow-hidden rounded-full bg-papel">
                      <span
                        className="barra-cresce block h-full rounded-full"
                        style={{
                          width: `${pct}%`,
                          background: corDoValor(l.valor, min, max),
                          boxShadow: "inset 0 0 0 1px rgb(10 42 61 / 0.08)",
                          animationDelay: `${i * 30}ms`,
                        }}
                      />
                    </span>
                    <span className="w-24 text-right font-semibold tabular-nums">{formatarValor(l.valor, atual.unidade)}</span>
                  </Link>
                </li>
              );
            })}
          </ol>
          <p className="mt-3 px-2 text-xs text-suave">
            {atual.fonte} · {atual.periodo ?? "—"}. Passe o mouse numa cidade da lista para vê-la no mapa.
          </p>
        </div>
      </div>
    </section>
  );
}
