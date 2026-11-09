// Faixas do índice de violência (100 = taxa do RS). Mesmos cortes descritos na página Sobre.
export type Faixa = { id: "baixa" | "moderada" | "alta" | "muito_alta"; rotulo: string; ate: number; cor: string };

export const FAIXAS: Faixa[] = [
  { id: "baixa", rotulo: "Baixa", ate: 75, cor: "#17803d" },
  { id: "moderada", rotulo: "Moderada", ate: 125, cor: "#c99a1c" },
  { id: "alta", rotulo: "Alta", ate: 175, cor: "#d9721f" },
  { id: "muito_alta", rotulo: "Muito alta", ate: Infinity, cor: "#c0392b" },
];

// Fim visível da escala do termômetro; valores acima ficam encostados no final.
export const ESCALA_MAX = 250;

export function faixaDoIndice(valor: number): Faixa {
  return FAIXAS.find((f) => valor < f.ate)!;
}

export function frasePosicaoRS(valor: number): string {
  const razao = valor / 100;
  if (razao >= 0.95 && razao <= 1.05) return "praticamente igual à média do RS";
  if (razao > 1) return `${razao.toFixed(1).replace(".", ",")} vezes a média do RS`;
  return `${Math.round((1 - razao) * 100)}% abaixo da média do RS`;
}
