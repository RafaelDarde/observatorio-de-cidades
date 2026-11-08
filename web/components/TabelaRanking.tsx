"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatarValor } from "@/lib/formatar";
import { idMunicipio } from "@/lib/normalizar";
import { filtrarRanking } from "@/lib/rankings";
import type { Ranking } from "@/lib/tipos";

const UFS = ["AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS", "MT", "PA", "PB", "PE",
  "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO"];

export function TabelaRanking({ indicador, unidade }: { indicador: string; unidade: string }) {
  const [linhas, setLinhas] = useState<Ranking | null>(null);
  const [uf, setUf] = useState<string | null>(null);
  const [ordem, setOrdem] = useState<"desc" | "asc">("desc");
  const [pagina, setPagina] = useState(1);

  useEffect(() => {
    fetch(`/dados/rankings/${indicador}.json`).then((r) => r.json()).then(setLinhas);
  }, [indicador]);

  if (!linhas) return <p className="text-suave">Carregando…</p>;
  const r = filtrarRanking(linhas, { uf, ordem, pagina });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <select
          aria-label="Filtrar por UF"
          value={uf ?? ""}
          onChange={(e) => { setUf(e.target.value || null); setPagina(1); }}
          className="rounded-lg border border-linha bg-cartao px-3 py-2"
        >
          <option value="">Brasil</option>
          {UFS.map((u) => <option key={u} value={u}>{u}</option>)}
        </select>
        <button
          type="button"
          onClick={() => { setOrdem(ordem === "desc" ? "asc" : "desc"); setPagina(1); }}
          className="rounded-lg border border-linha bg-cartao px-3 py-2"
        >
          {ordem === "desc" ? "Maiores primeiro ↓" : "Menores primeiro ↑"}
        </button>
        <span className="text-suave">{(uf ? linhas.filter((l) => l.uf === uf) : linhas).length.toLocaleString("pt-BR")} municípios</span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-linha bg-cartao">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-linha text-left text-suave">
              <th className="px-4 py-2 font-medium">Posição</th>
              <th className="px-4 py-2 font-medium">Município</th>
              <th className="px-4 py-2 font-medium">UF</th>
              <th className="px-4 py-2 text-right font-medium">Valor</th>
            </tr>
          </thead>
          <tbody>
            {r.linhas.map((l) => (
              <tr key={l.cod} className="border-b border-linha last:border-0">
                <td className="px-4 py-2 tabular-nums text-suave">{l.posicao.toLocaleString("pt-BR")}º</td>
                <td className="px-4 py-2">
                  <Link href={`/municipio/${idMunicipio(l.cod, l.nome)}`} className="hover:text-destaque">{l.nome}</Link>
                </td>
                <td className="px-4 py-2 text-suave">{l.uf}</td>
                <td className="px-4 py-2 text-right tabular-nums">{formatarValor(l.valor, unidade)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-center gap-3 text-sm">
        <button type="button" disabled={r.pagina <= 1} onClick={() => setPagina(r.pagina - 1)}
                className="rounded-lg border border-linha bg-cartao px-3 py-1 disabled:opacity-40">Anterior</button>
        <span className="text-suave">Página {r.pagina} de {r.totalPaginas}</span>
        <button type="button" disabled={r.pagina >= r.totalPaginas} onClick={() => setPagina(r.pagina + 1)}
                className="rounded-lg border border-linha bg-cartao px-3 py-1 disabled:opacity-40">Próxima</button>
      </div>
    </div>
  );
}
