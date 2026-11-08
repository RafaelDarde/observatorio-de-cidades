import type { Indicador } from "./tipos";

export type Visualizacao = "vazio" | "barras" | "linha" | "cartao";

export function tipoVisualizacao(d: Indicador | null): Visualizacao {
  if (d === null || (d.serie.length === 0 && d.ultimo === null)) return "vazio";
  if (d.por_recorte && d.por_recorte.length > 0) return "barras";
  if (d.serie.length >= 2) return "linha";
  return "cartao";
}

// Chave da fonte em meta.json (tabela `cargas` do pipeline) para cada indicador.
const DERIVADOS = new Set(["populacao_var_5a", "pib_per_capita", "caged_saldo_12m", "caged_saldo_12m_por_mil_hab"]);

export function fonteDoIndicador(id: string): string {
  if (DERIVADOS.has(id)) return "derivado";
  if (id.startsWith("populacao")) return "ibge_populacao";
  if (id.startsWith("pib") || id.startsWith("vab")) return "ibge_pib";
  if (id.startsWith("cempre")) return "ibge_cempre";
  return "caged";
}
