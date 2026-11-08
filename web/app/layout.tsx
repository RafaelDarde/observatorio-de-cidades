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
  title: "Observatório do Litoral Gaúcho",
  description: "Dados públicos de população, economia, empresas e emprego dos municípios do litoral do Rio Grande do Sul.",
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
          <footer className="px-4 pb-8 pt-2 text-center text-xs text-suave">
            Dados públicos: IBGE e Ministério do Trabalho (Novo CAGED). Projeto de estudo.
          </footer>
        </div>
      </body>
    </html>
  );
}
