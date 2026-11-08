import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Observatório de Cidades",
  description: "Dados públicos de população, economia, empresas e emprego dos municípios brasileiros.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <header className="border-b border-linha bg-cartao">
          <nav className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3 text-sm">
            <Link href="/" className="font-semibold tracking-tight text-tinta">
              Observatório de Cidades
            </Link>
            <span className="flex-1" />
            <Link href="/rankings" prefetch={false} className="text-suave hover:text-tinta">Rankings</Link>
            <Link href="/sobre" prefetch={false} className="text-suave hover:text-tinta">Sobre</Link>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
        <footer className="border-t border-linha px-4 py-6 text-center text-xs text-suave">
          Dados públicos: IBGE e Ministério do Trabalho (Novo CAGED). Projeto de estudo.
        </footer>
      </body>
    </html>
  );
}
