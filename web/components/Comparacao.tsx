"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { BuscaMunicipio } from "@/components/BuscaMunicipio";
import { GraficoComparacao } from "@/components/Graficos";
import { buscarJson } from "@/lib/carregar";
import { MAX_COMPARAR, montarUrl, parseCodigos, seriesComparacao } from "@/lib/comparar";
import { formatarValor } from "@/lib/formatar";
import { idMunicipio } from "@/lib/normalizar";
import type { Catalogo, IndiceMunicipios, Perfil } from "@/lib/tipos";

export function Comparacao({ catalogo }: { catalogo: Catalogo }) {
  const router = useRouter();
  const params = useSearchParams();
  const [indice, setIndice] = useState<IndiceMunicipios | null>(null);
  const [perfis, setPerfis] = useState<Record<string, Perfil>>({});
  const [todos, setTodos] = useState(false);
  const [falhas, setFalhas] = useState<string[]>([]);
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    buscarJson<IndiceMunicipios>("/dados/municipios.json")
      .then(setIndice)
      .catch(() => setFalhas((f) => [...f, "lista de municípios"]));
  }, [tentativa]);

  const { validos, invalidos } = indice
    ? parseCodigos(params.get("c"), new Set(indice.map((m) => m.cod)))
    : { validos: [], invalidos: [] };

  useEffect(() => {
    for (const cod of validos) {
      if (perfis[cod]) continue;
      buscarJson<Perfil>(`/dados/municipios/${cod}.json`)
        .then((p) => setPerfis((atual) => ({ ...atual, [cod]: p })))
        .catch(() => setFalhas((f) => [...f, cod]));
    }
  }, [validos.join(","), tentativa]); // eslint-disable-line react-hooks/exhaustive-deps

  const atualizar = (codigos: string[]) => router.replace(montarUrl(codigos), { scroll: false });
  const selecionados = validos.map((c) => perfis[c]).filter(Boolean);
  const itens = catalogo.filter((c) => todos || c.relativo);

  const tentarDeNovo = () => { setFalhas([]); setTentativa((t) => t + 1); };
  const avisoFalha = falhas.length > 0 && (
    <p role="alert" className="text-sm text-negativo">
      Não foi possível carregar alguns dados.{" "}
      <button type="button" onClick={tentarDeNovo} className="underline">Tentar de novo</button>
    </p>
  );
  if (!indice) return avisoFalha || <p className="text-suave">Carregando…</p>;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        {selecionados.map((p) => (
          <span key={p.cod} className="flex items-center gap-2 rounded-full border border-linha bg-cartao px-3 py-1 text-sm">
            <Link href={`/municipio/${idMunicipio(p.cod, p.nome)}`} className="hover:text-destaque">
              {p.nome} – {p.uf}
            </Link>
            <button
              type="button"
              aria-label={`Remover ${p.nome}`}
              onClick={() => atualizar(validos.filter((c) => c !== p.cod))}
              className="text-suave hover:text-negativo"
            >
              ×
            </button>
          </span>
        ))}
        <div className="w-full sm:w-72">
          <BuscaMunicipio
            desativado={validos.length >= MAX_COMPARAR}
            placeholder={validos.length >= MAX_COMPARAR ? "Máximo de 3 municípios" : "Adicionar município…"}
            aoSelecionar={(m) => atualizar([...validos.filter((c) => c !== m.cod), m.cod])}
          />
        </div>
      </div>

      {avisoFalha}
      {invalidos.length > 0 && (
        <p className="text-xs text-suave">Códigos ignorados (não encontrados): {invalidos.join(", ")}</p>
      )}

      {selecionados.length === 0 ? (
        <p className="text-suave">Escolha até três municípios para comparar.</p>
      ) : (
        <>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={todos} onChange={(e) => setTodos(e.target.checked)} />
            Mostrar também valores absolutos (PIB, população…)
          </label>

          <div className="overflow-x-auto rounded-xl border border-linha bg-cartao">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-linha text-left text-suave">
                  <th className="px-4 py-2 font-medium">Indicador</th>
                  {selecionados.map((p) => (
                    <th key={p.cod} className="px-4 py-2 text-right font-medium">{p.nome} – {p.uf}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {itens.map((c) => (
                  <tr key={c.id} className="border-b border-linha last:border-0">
                    <td className="px-4 py-2">{c.nome}</td>
                    {selecionados.map((p) => {
                      const ultimo = p.indicadores[c.id]?.ultimo;
                      return (
                        <td key={p.cod} className="px-4 py-2 text-right tabular-nums">
                          {formatarValor(ultimo?.valor, c.unidade)}
                          {ultimo && <span className="ml-1 text-xs text-suave">({ultimo.periodo})</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {itens
              .filter((c) => selecionados.some((p) => (p.indicadores[c.id]?.serie.length ?? 0) >= 2))
              .map((c) => (
                <article key={c.id} className="rounded-xl border border-linha bg-cartao p-5">
                  <h3 className="mb-2 font-medium">{c.nome}</h3>
                  <GraficoComparacao
                    unidade={c.unidade}
                    series={seriesComparacao(selecionados, c.id)}
                  />
                  <p className="mt-2 text-xs text-suave">Fonte: {c.fonte}</p>
                </article>
              ))}
          </div>
        </>
      )}
    </div>
  );
}
