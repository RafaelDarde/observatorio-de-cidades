"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { BuscaMunicipio } from "@/components/BuscaMunicipio";
import { CORES, GraficoComparacao } from "@/components/Graficos";
import { buscarJson } from "@/lib/carregar";
import { MAX_COMPARAR, montarUrl, parseCodigos, seriesComparacao } from "@/lib/comparar";
import { formatarValor } from "@/lib/formatar";
import { idMunicipio } from "@/lib/normalizar";
import type { Catalogo, IndiceMunicipios, Perfil } from "@/lib/tipos";

const SUGESTOES = [
  { nomes: ["Torres", "Tramandaí"] },
  { nomes: ["Capão da Canoa", "Xangri-lá", "Imbé"] },
  { nomes: ["Rio Grande", "Santa Vitória do Palmar"] },
];

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
      <div className="cartao flex flex-wrap items-center gap-3 p-4">
        {selecionados.map((p, i) => (
          <span key={p.cod} className="flex items-center gap-2 rounded-full border border-linha bg-papel py-1 pl-3 pr-1.5 text-sm font-medium">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: CORES[i % CORES.length] }} aria-hidden="true" />
            <Link href={`/municipio/${idMunicipio(p.cod, p.nome)}`} className="hover:text-destaque">
              {p.nome} – {p.uf}
            </Link>
            <button
              type="button"
              aria-label={`Remover ${p.nome}`}
              onClick={() => atualizar(validos.filter((c) => c !== p.cod))}
              className="flex h-6 w-6 items-center justify-center rounded-full text-suave transition-colors hover:bg-negativo hover:text-white"
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
        <div className="cartao p-6 text-center">
          <p className="titulo text-lg font-semibold">Escolha até três municípios para comparar</p>
          <p className="mt-1 text-sm text-suave">Busque pelo nome acima ou comece por uma combinação popular:</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {SUGESTOES.map((sug) => {
              const cods = sug.nomes.map((n) => indice.find((m) => m.nome === n)?.cod).filter((c): c is string => !!c);
              return cods.length === sug.nomes.length ? (
                <button
                  key={sug.nomes.join()}
                  type="button"
                  onClick={() => atualizar(cods)}
                  className="rounded-full bg-espuma px-4 py-2 text-sm font-medium text-mare transition-colors hover:bg-mare hover:text-white"
                >
                  {sug.nomes.join(" × ")}
                </button>
              ) : null;
            })}
          </div>
        </div>
      ) : (
        <>
          <label className="flex w-fit cursor-pointer items-center gap-2 rounded-full bg-cartao px-4 py-2 text-sm shadow-sm ring-1 ring-linha">
            <input type="checkbox" className="accent-[#0b6a80]" checked={todos} onChange={(e) => setTodos(e.target.checked)} />
            Mostrar também valores absolutos (PIB, população…)
          </label>

          <div className="cartao overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-linha text-left text-suave">
                  <th className="px-4 py-3 font-medium">Indicador</th>
                  {selecionados.map((p) => (
                    <th key={p.cod} className="px-4 py-3 text-right font-semibold text-tinta">
                      <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ background: CORES[selecionados.indexOf(p) % CORES.length] }} aria-hidden="true" />
                      {p.nome} – {p.uf}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {itens.map((c) => (
                  <tr key={c.id} className="border-b border-linha last:border-0 hover:bg-espuma/40">
                    <td className="px-4 py-2.5">{c.nome}</td>
                    {selecionados.map((p) => {
                      const ultimo = p.indicadores[c.id]?.ultimo;
                      return (
                        <td key={p.cod} className="px-4 py-2.5 text-right font-semibold tabular-nums">
                          {formatarValor(ultimo?.valor, c.unidade)}
                          {ultimo && <span className="ml-1 text-xs font-normal text-suave">({ultimo.periodo})</span>}
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
                <article key={c.id} className="cartao p-5">
                  <h3 className="mb-2 text-base font-semibold">{c.nome}</h3>
                  <GraficoComparacao
                    unidade={c.unidade}
                    series={seriesComparacao(selecionados, c.id)}
                  />
                  <p className="mt-2 border-t border-linha pt-3 text-xs text-suave">Fonte: {c.fonte}</p>
                </article>
              ))}
          </div>
        </>
      )}
    </div>
  );
}
