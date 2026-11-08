import type { Metadata } from "next";
import Link from "next/link";
import { lerCatalogo } from "@/lib/dados";

export const metadata: Metadata = { title: "Rankings — Observatório de Cidades" };

export default function PaginaRankings() {
  const itens = lerCatalogo().filter((c) => c.ranking);
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">Rankings</h1>
      <ul className="grid gap-3 sm:grid-cols-2">
        {itens.map((c) => (
          <li key={c.id}>
            <Link href={`/rankings/${c.id}`}
                  className="block rounded-xl border border-linha bg-cartao p-4 hover:border-destaque">
              <span className="font-medium">{c.nome}</span>
              <span className="mt-1 block text-xs text-suave">{c.fonte} · {c.periodo_max ?? "—"}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
