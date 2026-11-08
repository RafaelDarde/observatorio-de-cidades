import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TabelaRanking } from "@/components/TabelaRanking";
import { lerCatalogo } from "@/lib/dados";

export const dynamicParams = false;

export function generateStaticParams() {
  return lerCatalogo().filter((c) => c.ranking).map((c) => ({ indicador: c.id }));
}

function itemDe(id: string) {
  const item = lerCatalogo().find((c) => c.id === id && c.ranking);
  if (!item) notFound();
  return item;
}

export async function generateMetadata({ params }: PageProps<"/rankings/[indicador]">): Promise<Metadata> {
  const item = itemDe((await params).indicador);
  return { title: `Ranking: ${item.nome} — Observatório do Litoral Gaúcho` };
}

export default async function PaginaRanking({ params }: PageProps<"/rankings/[indicador]">) {
  const item = itemDe((await params).indicador);
  return (
    <div className="space-y-6">
      <header>
        <Link href="/rankings" className="text-sm font-medium text-destaque hover:underline">← Rankings</Link>
        <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">{item.nome}</h1>
        <p className="mt-2 max-w-2xl text-suave">{item.descricao}</p>
        <p className="mt-1 text-xs text-suave">Fonte: {item.fonte} · Período: {item.periodo_max ?? "—"}</p>
      </header>
      <TabelaRanking indicador={item.id} unidade={item.unidade} />
    </div>
  );
}
