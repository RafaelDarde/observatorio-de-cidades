"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { buscarMunicipios } from "@/lib/buscar";
import { carregarIndice } from "@/lib/carregar";
import { idMunicipio } from "@/lib/normalizar";
import type { IndiceMunicipios } from "@/lib/tipos";

type Item = IndiceMunicipios[number];

export function BuscaMunicipio({
  aoSelecionar,
  placeholder = "Buscar município…",
  desativado = false,
  autoFocus = false,
  variante = "padrao",
}: {
  aoSelecionar?: (m: Item) => void;
  placeholder?: string;
  desativado?: boolean;
  autoFocus?: boolean;
  variante?: "padrao" | "hero";
}) {
  const router = useRouter();
  const listaId = useId();
  const [indice, setIndice] = useState<IndiceMunicipios>([]);
  const [consulta, setConsulta] = useState("");
  const [ativo, setAtivo] = useState(0);
  const [aberto, setAberto] = useState(false);
  const [falhou, setFalhou] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) input.current?.focus();
  }, [autoFocus]);

  const resultados = buscarMunicipios(indice, consulta);

  function escolher(m: Item) {
    setConsulta("");
    setAberto(false);
    if (aoSelecionar) aoSelecionar(m);
    else router.push(`/municipio/${idMunicipio(m.cod, m.nome)}`);
  }

  function aoTeclar(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setAtivo((i) => Math.min(i + 1, resultados.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setAtivo((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && resultados[ativo]) {
      e.preventDefault();
      escolher(resultados[ativo]);
    } else if (e.key === "Escape") {
      setAberto(false);
    }
  }

  return (
    <div className="relative w-full">
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        aria-hidden="true"
        className={`pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 ${variante === "hero" ? "text-suave" : "text-suave/80"}`}
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input
        ref={input}
        type="search"
        role="combobox"
        aria-expanded={aberto && resultados.length > 0}
        aria-controls={listaId}
        aria-label="Buscar município"
        disabled={desativado}
        placeholder={placeholder}
        value={consulta}
        onFocus={() =>
          carregarIndice()
            .then((i) => { setIndice(i); setFalhou(false); })
            .catch(() => setFalhou(true))
        }
        onChange={(e) => {
          setConsulta(e.target.value);
          setAtivo(0);
          setAberto(true);
        }}
        onKeyDown={aoTeclar}
        onBlur={() => setTimeout(() => setAberto(false), 150)}
        className={`w-full rounded-xl border bg-cartao py-3 pl-11 pr-4 text-base text-tinta outline-none transition-shadow placeholder:text-suave/70 focus:border-destaque focus:ring-4 focus:ring-farol/40 disabled:opacity-50 ${
          variante === "hero" ? "border-transparent py-3.5 shadow-lg" : "border-linha"
        }`}
      />
      {falhou && (
        <p role="alert" className={`mt-1 text-xs ${variante === "hero" ? "text-red-200" : "text-negativo"}`}>
          Não foi possível carregar a lista de municípios. Clique na busca para tentar de novo.
        </p>
      )}
      {aberto && resultados.length > 0 && (
        <ul
          id={listaId}
          role="listbox"
          className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-linha bg-cartao p-1 text-tinta shadow-xl"
        >
          {resultados.map((m, i) => (
            <li
              key={m.cod}
              role="option"
              aria-selected={i === ativo}
              onMouseDown={(e) => {
                e.preventDefault();
                escolher(m);
              }}
              onMouseEnter={() => setAtivo(i)}
              className={`cursor-pointer rounded-lg px-3 py-2 ${i === ativo ? "bg-espuma" : ""}`}
            >
              {m.nome} <span className="text-suave">– {m.uf}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
