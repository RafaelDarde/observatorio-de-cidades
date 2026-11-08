import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Cartao, Indicador } from "@/components/Indicador";
import { lerCatalogo, lerIndice, lerMeta, lerPerfil } from "@/lib/dados";
import { codDeId, idMunicipio } from "@/lib/normalizar";
import type { Tema } from "@/lib/tipos";
import { fonteDoIndicador } from "@/lib/visualizacao";

export const dynamicParams = false;

const CARTOES = ["populacao", "pib_per_capita", "cempre_pessoal_ocupado", "caged_saldo_12m"];
const TEMAS: { id: Tema; titulo: string }[] = [
  { id: "populacao", titulo: "População" },
  { id: "economia", titulo: "Economia" },
  { id: "empresas", titulo: "Empresas" },
  { id: "emprego", titulo: "Emprego formal" },
];

export function generateStaticParams() {
  return lerIndice().map((m) => ({ id: idMunicipio(m.cod, m.nome) }));
}

async function perfilDe(params: PageProps<"/municipio/[id]">["params"]) {
  const { id } = await params;
  const perfil = lerPerfil(codDeId(id));
  if (!perfil || idMunicipio(perfil.cod, perfil.nome) !== id) notFound();
  return perfil;
}

export async function generateMetadata({ params }: PageProps<"/municipio/[id]">): Promise<Metadata> {
  const perfil = await perfilDe(params);
  return { title: `${perfil.nome} (${perfil.uf}) — Observatório de Cidades` };
}

export default async function PaginaMunicipio({ params }: PageProps<"/municipio/[id]">) {
  const perfil = await perfilDe(params);
  const catalogo = lerCatalogo();
  const fontes = lerMeta().fontes;
  const porId = Object.fromEntries(catalogo.map((c) => [c.id, c]));

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-suave">{perfil.regiao} · {perfil.uf}</p>
          <h1 className="text-3xl font-semibold tracking-tight">{perfil.nome}</h1>
        </div>
        <Link
          href={`/comparar?c=${perfil.cod}`}
          className="rounded-lg border border-destaque px-4 py-2 text-sm font-medium text-destaque hover:bg-destaque hover:text-white"
        >
          Comparar com…
        </Link>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {CARTOES.filter((id) => porId[id]).map((id) => (
          <Cartao key={id} item={porId[id]} dados={perfil.indicadores[id] ?? null} />
        ))}
      </section>

      {TEMAS.map((tema) => (
        <section key={tema.id} className="space-y-3">
          <h2 className="text-lg font-semibold">{tema.titulo}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {catalogo
              .filter((c) => c.tema === tema.id)
              .map((c) => (
                <Indicador
                  key={c.id}
                  item={c}
                  dados={perfil.indicadores[c.id] ?? null}
                  carregadoEm={fontes[fonteDoIndicador(c.id)]?.carregado_em}
                />
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}
