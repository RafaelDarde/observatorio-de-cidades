import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Cartao, Indicador } from "@/components/Indicador";
import { MiniMapaCidade } from "@/components/MiniMapaCidade";
import { Termometro } from "@/components/Termometro";
import { lerCatalogo, lerIndice, lerMeta, lerPerfil } from "@/lib/dados";
import { codDeId, idMunicipio } from "@/lib/normalizar";
import type { Tema } from "@/lib/tipos";
import { fonteDoIndicador } from "@/lib/visualizacao";

export const dynamicParams = false;

// Mostradas no termômetro, não na grade de indicadores.
const NOTAS_SEGURANCA = ["seg_nota", "seg_nota_veraneio"];
const CARTOES = ["populacao", "pib_per_capita", "cempre_pessoal_ocupado", "caged_saldo_12m"];
const TEMAS: { id: Tema; titulo: string }[] = [
  { id: "populacao", titulo: "População" },
  { id: "economia", titulo: "Economia" },
  { id: "empresas", titulo: "Empresas" },
  { id: "emprego", titulo: "Emprego formal" },
  { id: "seguranca", titulo: "Segurança" },
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
  return { title: `${perfil.nome} (${perfil.uf}) — Observatório Litoral Gaúcho` };
}

export default async function PaginaMunicipio({ params }: PageProps<"/municipio/[id]">) {
  const perfil = await perfilDe(params);
  const catalogo = lerCatalogo();
  const fontes = lerMeta().fontes;
  const porId = Object.fromEntries(catalogo.map((c) => [c.id, c]));

  return (
    <div className="space-y-8">
      <header className="relative rounded-3xl bg-gradient-to-br from-mare via-mare to-mare-2 text-white shadow-[0_20px_40px_-24px_rgb(10_42_61/0.7)]">
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl" aria-hidden="true">
          <div className="farol-brilho absolute -left-16 -top-24 h-72 w-72 rounded-full bg-farol/25 blur-3xl" />
        </div>
        <div className="relative flex items-center justify-between gap-6 px-6 py-8 sm:px-10 sm:py-10">
          <div className="min-w-0">
            <nav aria-label="Você está em" className="text-sm text-white/65">
              <Link href="/" className="hover:text-white">Panorama</Link>
              <span className="mx-2" aria-hidden="true">/</span>
              {perfil.regiao}, {perfil.uf}
            </nav>
            <h1 className="mt-2 text-4xl font-semibold leading-tight sm:text-5xl">{perfil.nome}</h1>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Link
                href={`/comparar?c=${perfil.cod}`}
                prefetch={false}
                className="rounded-xl bg-farol px-4 py-2.5 text-sm font-semibold text-mare transition-colors hover:bg-white"
              >
                Comparar com…
              </Link>
              <nav aria-label="Temas" className="flex flex-wrap gap-1.5">
                {TEMAS.map((t) => (
                  <a key={t.id} href={`#${t.id}`} className="rounded-full bg-white/10 px-3 py-1.5 text-sm text-white/90 transition-colors hover:bg-white/20">
                    {t.titulo}
                  </a>
                ))}
              </nav>
            </div>
          </div>
          <div className="hidden w-40 shrink-0 sm:block md:w-[180px]">
            <MiniMapaCidade cod={perfil.cod} nome={perfil.nome} />
          </div>
        </div>
      </header>

      <section aria-label="Resumo" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {CARTOES.filter((id) => porId[id]).map((id) => (
          <Cartao key={id} item={porId[id]} dados={perfil.indicadores[id] ?? null} />
        ))}
      </section>

      {TEMAS.map((tema) => (
        <section key={tema.id} id={tema.id} className="scroll-mt-20 space-y-4 lg:scroll-mt-6">
          <h2 className="text-2xl font-semibold">{tema.titulo}</h2>
          {tema.id === "seguranca" && (
            <Termometro
              nota={perfil.indicadores.seg_nota ?? null}
              veraneio={perfil.indicadores.seg_nota_veraneio ?? null}
            />
          )}
          <div className="grid gap-4 md:grid-cols-2">
            {catalogo
              .filter((c) => c.tema === tema.id && !NOTAS_SEGURANCA.includes(c.id))
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
