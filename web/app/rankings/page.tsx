import type { Metadata } from "next";
import Link from "next/link";
import { lerCatalogo, lerRanking } from "@/lib/dados";
import { formatarValor } from "@/lib/formatar";
import type { Tema } from "@/lib/tipos";

export const metadata: Metadata = { title: "Rankings — Observatório Litoral Gaúcho" };

const TEMAS: { id: Tema; titulo: string }[] = [
  { id: "populacao", titulo: "População" },
  { id: "economia", titulo: "Economia" },
  { id: "empresas", titulo: "Empresas" },
  { id: "emprego", titulo: "Emprego formal" },
];

export default function PaginaRankings() {
  const itens = lerCatalogo().filter((c) => c.ranking);
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-semibold sm:text-4xl">Rankings</h1>
        <p className="mt-2 max-w-xl text-suave">
          Escolha um indicador para ver como as 16 cidades do litoral se comparam, da primeira à última.
        </p>
      </header>
      {TEMAS.map((t) => {
        const doTema = itens.filter((c) => c.tema === t.id);
        if (doTema.length === 0) return null;
        return (
          <section key={t.id} className="space-y-3" aria-labelledby={`tema-${t.id}`}>
            <h2 id={`tema-${t.id}`} className="text-lg font-semibold">{t.titulo}</h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {doTema.map((c) => {
                const lider = lerRanking(c.id)[0];
                return (
                  <li key={c.id}>
                    <Link
                      href={`/rankings/${c.id}`}
                      className="cartao group flex h-full items-center justify-between gap-4 p-4 transition-colors hover:border-destaque"
                    >
                      <span className="min-w-0">
                        <span className="block font-semibold">{c.nome}</span>
                        <span className="mt-0.5 block text-sm text-suave">
                          {lider ? `Lidera: ${lider.nome}, ${formatarValor(lider.valor, c.unidade)}` : "Sem dados"}
                        </span>
                        <span className="mt-0.5 block text-xs text-suave">{c.fonte} · {c.periodo_max ?? "—"}</span>
                      </span>
                      <span aria-hidden="true" className="text-xl text-destaque transition-transform group-hover:translate-x-1">→</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
