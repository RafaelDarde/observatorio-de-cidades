import type { Metadata } from "next";
import { Bricolage_Grotesque, Hanken_Grotesk } from "next/font/google";
import "./globals.css";
import { NavLateral } from "@/components/NavLateral";
import { lerIndice, lerMeta } from "@/lib/dados";
import { malha } from "@/lib/mapa";
import { idMunicipio } from "@/lib/normalizar";

const titulo = Bricolage_Grotesque({ variable: "--font-titulo", subsets: ["latin"] });
const corpo = Hanken_Grotesk({ variable: "--font-corpo", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Observatório Litoral Gaúcho",
  description: "Dados públicos de população, economia, empresas, emprego e segurança dos municípios do litoral do Rio Grande do Sul.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const norte = Object.fromEntries(malha.municipios.map((m) => [m.cod, m.cy]));
  const cidades = [...lerIndice()]
    .sort((a, b) => (norte[a.cod] ?? 0) - (norte[b.cod] ?? 0))
    .map((m) => ({ cod: m.cod, nome: m.nome, id: idMunicipio(m.cod, m.nome) }));
  const geradoEm = new Date(lerMeta().gerado_em).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });

  return (
    <html lang="pt-BR" className={`${titulo.variable} ${corpo.variable} h-full antialiased`}>
      <body className="min-h-full">
        <NavLateral cidades={cidades} atualizadoEm={geradoEm} />
        <div className="flex min-h-screen flex-col lg:pl-64">
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-8 sm:py-9">{children}</main>
          <footer className="mx-auto w-full max-w-6xl px-4 pb-8 pt-4 sm:px-8">
            <div className="flex flex-col items-center gap-3 border-t border-linha pt-6 text-center sm:flex-row sm:justify-between sm:text-left">
              <div>
                <p className="text-sm font-semibold text-tinta">Rafael Darde</p>
                <p className="text-xs text-suave">Criador e administrador do Observatório Litoral Gaúcho</p>
              </div>
              <a
                href="mailto:rafael.darde@gmail.com"
                className="inline-flex items-center gap-2 rounded-xl border border-linha bg-cartao px-3.5 py-2 text-sm font-medium text-destaque transition-colors hover:border-destaque"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <path d="m3 7 9 6 9-6" />
                </svg>
                rafael.darde@gmail.com
              </a>
            </div>
            <p className="mt-4 text-center text-xs text-suave sm:text-left">
              Dados públicos: IBGE, Ministério do Trabalho (Novo CAGED) e Secretaria da Segurança Pública do RS.
            </p>
          </footer>
        </div>
      </body>
    </html>
  );
}
