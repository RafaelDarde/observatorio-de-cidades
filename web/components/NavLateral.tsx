"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";

type Cidade = { cod: string; nome: string; id: string };

const ICONES: Record<string, React.ReactNode> = {
  inicio: <path d="M3 11.5 12 4l9 7.5M5.5 10v9.5h13V10" />,
  rankings: <path d="M5 20V10m7 10V4m7 16v-7" />,
  comparar: <path d="M8 4v16M16 4v16M4 8h8M12 16h8" />,
  sobre: <path d="M12 11v6m0-10v.01M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18Z" />,
};

const LINKS = [
  { href: "/", rotulo: "Panorama", icone: "inicio", exato: true },
  { href: "/rankings", rotulo: "Rankings", icone: "rankings" },
  { href: "/comparar", rotulo: "Comparar cidades", icone: "comparar" },
  { href: "/sobre", rotulo: "Sobre os dados", icone: "sobre" },
];

function Conteudo({ cidades, fechar, atualizadoEm }: { cidades: Cidade[]; fechar?: () => void; atualizadoEm: string }) {
  const caminho = usePathname();
  return (
    <div className="flex h-full flex-col">
      <Link href="/" onClick={fechar} className="flex items-center gap-3 px-5 pb-5 pt-6">
        <Logo />
        <span className="titulo text-[17px] font-semibold leading-tight text-white">
          Observatório
          <br />
          do Litoral Gaúcho
        </span>
      </Link>

      <nav aria-label="Principal" className="space-y-0.5 px-3">
        {LINKS.map((l) => {
          const ativo = l.exato ? caminho === l.href : caminho.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              prefetch={false}
              onClick={fechar}
              aria-current={ativo ? "page" : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                ativo ? "bg-white/12 text-white" : "text-white/70 hover:bg-white/8 hover:text-white"
              }`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                {ICONES[l.icone]}
              </svg>
              {l.rotulo}
              {ativo && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-farol" />}
            </Link>
          );
        })}
      </nav>

      <div className="rolagem-discreta mt-6 min-h-0 flex-1 overflow-y-auto px-3 pb-6">
        <p className="px-3 pb-2 text-xs font-medium text-white/50">De Torres ao Chuí</p>
        <ul className="relative space-y-px border-l border-white/15 pl-0 ml-5">
          {cidades.map((c) => {
            const ativo = caminho === `/municipio/${c.id}`;
            return (
              <li key={c.cod}>
                <Link
                  href={`/municipio/${c.id}`}
                  onClick={fechar}
                  aria-current={ativo ? "page" : undefined}
                  className={`relative block rounded-r-md py-1.5 pl-4 pr-2 text-[13px] transition-colors ${
                    ativo ? "bg-white/10 font-medium text-white" : "text-white/65 hover:text-white"
                  }`}
                >
                  <span
                    className={`absolute -left-[3px] top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full ${ativo ? "bg-farol" : "bg-white/35"}`}
                  />
                  {c.nome}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      <p className="border-t border-white/10 px-5 py-4 text-xs leading-relaxed text-white/55">
        Dados do IBGE e do Novo CAGED.
        <br />
        Atualizado em {atualizadoEm}.
      </p>
    </div>
  );
}

export function NavLateral({ cidades, atualizadoEm }: { cidades: Cidade[]; atualizadoEm: string }) {
  // O menu fica aberto só na página em que foi aberto; ao navegar, fecha sozinho.
  const [abertoEm, setAbertoEm] = useState<string | null>(null);
  const caminho = usePathname();
  const aberto = abertoEm === caminho;
  const setAberto = (v: boolean) => setAbertoEm(v ? caminho : null);

  useEffect(() => {
    if (!aberto) return;
    const fecharComEsc = (e: KeyboardEvent) => e.key === "Escape" && setAbertoEm(null);
    window.addEventListener("keydown", fecharComEsc);
    return () => window.removeEventListener("keydown", fecharComEsc);
  }, [aberto]);

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 bg-gradient-to-b from-mare via-mare to-mare-2 lg:block">
        <Conteudo cidades={cidades} atualizadoEm={atualizadoEm} />
      </aside>

      <div className="sticky top-0 z-30 flex items-center justify-between bg-mare px-4 py-3 lg:hidden">
        <Link href="/" className="flex items-center gap-2.5">
          <Logo tamanho={30} />
          <span className="titulo text-[15px] font-semibold leading-tight text-white">Observatório do Litoral Gaúcho</span>
        </Link>
        <button
          type="button"
          aria-label={aberto ? "Fechar menu" : "Abrir menu"}
          aria-expanded={aberto}
          onClick={() => setAberto(!aberto)}
          className="rounded-lg p-2 text-white hover:bg-white/10"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            {aberto ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>

      {aberto && (
        <div className="fixed inset-0 top-[54px] z-20 lg:hidden">
          <button type="button" aria-label="Fechar menu" className="absolute inset-0 bg-mare/50" onClick={() => setAberto(false)} />
          <div className="relative h-full w-72 max-w-[85%] bg-gradient-to-b from-mare to-mare-2">
            <Conteudo cidades={cidades} fechar={() => setAberto(false)} atualizadoEm={atualizadoEm} />
          </div>
        </div>
      )}
    </>
  );
}
