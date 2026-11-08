import Link from "next/link";
import { BuscaMunicipio } from "@/components/BuscaMunicipio";
import { lerCatalogo, lerRanking } from "@/lib/dados";
import { formatarValor } from "@/lib/formatar";
import { idMunicipio } from "@/lib/normalizar";
import type { Ranking } from "@/lib/tipos";

const DESTAQUE = "caged_saldo_12m_por_mil_hab";

function Lista({ titulo, itens, unidade }: { titulo: string; itens: Ranking; unidade: string }) {
  return (
    <div className="rounded-xl border border-linha bg-cartao p-5">
      <h3 className="mb-3 text-sm font-medium text-suave">{titulo}</h3>
      <ol className="space-y-2">
        {itens.map((m) => (
          <li key={m.cod} className="flex items-baseline justify-between gap-3 text-sm">
            <Link href={`/municipio/${idMunicipio(m.cod, m.nome)}`} className="hover:text-destaque">
              {m.nome} <span className="text-suave">– {m.uf}</span>
            </Link>
            <span className={`tabular-nums ${m.valor < 0 ? "text-negativo" : "text-positivo"}`}>
              {formatarValor(m.valor, unidade)}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default function Inicio() {
  const item = lerCatalogo().find((c) => c.id === DESTAQUE)!;
  const ranking = lerRanking(DESTAQUE);
  return (
    <div className="space-y-12">
      <section className="space-y-4 pt-6">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Dados públicos dos municípios brasileiros, num só lugar
        </h1>
        <p className="max-w-2xl text-suave">
          População, PIB, empresas e emprego de qualquer município, com fontes oficiais do IBGE e do
          Ministério do Trabalho. Busque uma cidade ou compare até três.
        </p>
        <div className="max-w-xl">
          <BuscaMunicipio autoFocus />
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">{item.nome}</h2>
          <Link href={`/rankings/${DESTAQUE}`} className="text-sm text-destaque hover:underline">
            Ver ranking completo
          </Link>
        </div>
        <p className="text-sm text-suave">
          {item.descricao} Período até {item.periodo_max}.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Lista titulo="Maiores saldos" itens={ranking.slice(0, 5)} unidade={item.unidade} />
          <Lista titulo="Menores saldos" itens={ranking.slice(-5).reverse()} unidade={item.unidade} />
        </div>
      </section>
    </div>
  );
}
