"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { buscarJson } from "@/lib/carregar";
import { formatarValor } from "@/lib/formatar";
import { idMunicipio } from "@/lib/normalizar";
import { filtrarRanking } from "@/lib/rankings";
import type { Ranking } from "@/lib/tipos";

export function TabelaRanking({ indicador, unidade }: { indicador: string; unidade: string }) {
  const [linhas, setLinhas] = useState<Ranking | null>(null);
  const [ordem, setOrdem] = useState<"desc" | "asc">("desc");
  const [pagina, setPagina] = useState(1);
  const [falhou, setFalhou] = useState(false);
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    buscarJson<Ranking>(`/dados/rankings/${indicador}.json`)
      .then((l) => { setLinhas(l); setFalhou(false); })
      .catch(() => setFalhou(true));
  }, [indicador, tentativa]);

  if (falhou)
    return (
      <p role="alert" className="text-sm text-negativo">
        Não foi possível carregar o ranking.{" "}
        <button type="button" onClick={() => setTentativa((t) => t + 1)} className="underline">Tentar de novo</button>
      </p>
    );
  if (!linhas) return <p className="text-suave">Carregando…</p>;
  const r = filtrarRanking(linhas, { uf: null, ordem, pagina });
  const maximo = Math.max(...linhas.map((l) => Math.abs(l.valor)), 1);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <button
          type="button"
          onClick={() => { setOrdem(ordem === "desc" ? "asc" : "desc"); setPagina(1); }}
          className="rounded-xl border border-linha bg-cartao px-3.5 py-2 font-medium transition-colors hover:border-destaque hover:text-destaque"
        >
          {ordem === "desc" ? "Maiores primeiro ↓" : "Menores primeiro ↑"}
        </button>
        <span className="text-suave">{linhas.length.toLocaleString("pt-BR")} municípios</span>
      </div>

      <div className="cartao overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-linha text-left text-suave">
              <th className="w-20 px-4 py-3 font-medium">Posição</th>
              <th className="px-4 py-3 font-medium">Município</th>
              <th className="hidden px-4 py-3 font-medium sm:table-cell">Comparação</th>
              <th className="px-4 py-3 text-right font-medium">Valor</th>
            </tr>
          </thead>
          <tbody key={`${ordem}-${r.pagina}`}>
            {r.linhas.map((l, i) => (
              <tr key={l.cod} className="border-b border-linha transition-colors last:border-0 hover:bg-espuma/50">
                <td className="px-4 py-2.5">
                  <span className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-xs font-semibold tabular-nums ${
                    l.posicao <= 3 ? "bg-farol/30 text-mare" : "bg-papel text-suave"
                  }`}>
                    {l.posicao.toLocaleString("pt-BR")}º
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <Link href={`/municipio/${idMunicipio(l.cod, l.nome)}`} className="font-medium hover:text-destaque">{l.nome}</Link>
                </td>
                <td className="hidden w-[38%] px-4 py-2.5 sm:table-cell" aria-hidden="true">
                  <span className="block h-2 overflow-hidden rounded-full bg-papel">
                    <span
                      className={`barra-cresce block h-full rounded-full ${l.valor < 0 ? "bg-negativo/70" : "bg-destaque"}`}
                      style={{ width: `${Math.max(2, (Math.abs(l.valor) / maximo) * 100)}%`, animationDelay: `${i * 25}ms` }}
                    />
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right font-semibold tabular-nums">{formatarValor(l.valor, unidade)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {r.totalPaginas > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm">
          <button type="button" disabled={r.pagina <= 1} onClick={() => setPagina(r.pagina - 1)}
                  className="rounded-xl border border-linha bg-cartao px-3.5 py-1.5 disabled:opacity-40">Anterior</button>
          <span className="text-suave">Página {r.pagina} de {r.totalPaginas}</span>
          <button type="button" disabled={r.pagina >= r.totalPaginas} onClick={() => setPagina(r.pagina + 1)}
                  className="rounded-xl border border-linha bg-cartao px-3.5 py-1.5 disabled:opacity-40">Próxima</button>
        </div>
      )}
    </div>
  );
}
