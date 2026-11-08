import type { Metadata } from "next";
import { Suspense } from "react";
import { Comparacao } from "@/components/Comparacao";
import { lerCatalogo } from "@/lib/dados";

export const metadata: Metadata = { title: "Comparar municípios — Observatório de Cidades" };

export default function PaginaComparar() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Comparar municípios</h1>
        <p className="mt-1 text-suave">
          Até três municípios lado a lado. Por padrão, só indicadores relativos (per capita, médias e taxas),
          que não dependem do tamanho da cidade.
        </p>
      </div>
      <Suspense fallback={<p className="text-suave">Carregando…</p>}>
        <Comparacao catalogo={lerCatalogo()} />
      </Suspense>
    </div>
  );
}
