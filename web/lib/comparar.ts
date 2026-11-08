import type { Perfil, Ponto } from "./tipos";

export const MAX_COMPARAR = 3;

export function parseCodigos(param: string | null, codigosValidos: Set<string>): { validos: string[]; invalidos: string[] } {
  const validos: string[] = [];
  const invalidos: string[] = [];
  const vistos = new Set<string>();
  for (const bruto of (param ?? "").split(",")) {
    const cod = bruto.trim();
    if (!cod || vistos.has(cod)) continue;
    vistos.add(cod);
    if (!codigosValidos.has(cod)) invalidos.push(cod);
    else if (validos.length < MAX_COMPARAR) validos.push(cod);
  }
  return { validos, invalidos };
}

export function montarUrl(codigos: string[]): string {
  return codigos.length ? `/comparar?c=${codigos.join(",")}` : "/comparar";
}

// Séries do gráfico de comparação, com chave pelo código: há nomes repetidos entre UFs.
export function seriesComparacao(perfis: Perfil[], indicador: string): { chave: string; nome: string; serie: Ponto[] }[] {
  return perfis.map((p) => ({ chave: p.cod, nome: `${p.nome} – ${p.uf}`, serie: p.indicadores[indicador]?.serie ?? [] }));
}
