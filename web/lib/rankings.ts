import type { Ranking } from "./tipos";

export type OpcoesRanking = { uf: string | null; ordem: "desc" | "asc"; pagina: number };

export function filtrarRanking(linhas: Ranking, opcoes: OpcoesRanking, porPagina = 50): { linhas: Ranking; totalPaginas: number; pagina: number } {
  let filtradas = opcoes.uf ? linhas.filter((l) => l.uf === opcoes.uf) : linhas;
  if (opcoes.ordem === "asc") filtradas = [...filtradas].reverse();
  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / porPagina));
  const pagina = Math.min(Math.max(1, opcoes.pagina), totalPaginas);
  return { linhas: filtradas.slice((pagina - 1) * porPagina, pagina * porPagina), totalPaginas, pagina };
}
