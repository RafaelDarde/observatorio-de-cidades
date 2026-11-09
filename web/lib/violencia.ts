// Nota de segurança (0–100; 50 = média do RS; maior = mais seguro). Mesmas faixas da página Sobre.
export type Faixa = { id: string; rotulo: string; de: number; cor: string };

export const FAIXAS: Faixa[] = [
  { id: "critica", rotulo: "Crítica", de: 0, cor: "#b3261e" },
  { id: "risco_alto", rotulo: "Risco alto", de: 20, cor: "#d9721f" },
  { id: "moderada", rotulo: "Moderada", de: 40, cor: "#c99a1c" },
  { id: "segura", rotulo: "Segura", de: 60, cor: "#5a9a3c" },
  { id: "muito_segura", rotulo: "Muito segura", de: 80, cor: "#17803d" },
];

export const MEDIA_RS = 50;

export function faixaDaNota(nota: number): Faixa {
  return [...FAIXAS].reverse().find((f) => Math.round(nota) >= f.de)!;
}

export function fraseComparacaoRS(nota: number): string {
  const d = Math.round(nota) - MEDIA_RS;
  if (Math.abs(d) <= 2) return "praticamente na média do RS";
  return d > 0 ? `${d} pontos acima da média do RS (mais segura)` : `${-d} pontos abaixo da média do RS (menos segura)`;
}

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

// "2025-10" -> "out/2025"
export function mesCurto(periodo: string): string {
  const [ano, mes] = periodo.split("-");
  return `${MESES[Number(mes) - 1]}/${ano}`;
}

// Primeiro mês da janela de 12 meses que termina em `fim`.
export function inicioJanela(fim: string): string {
  const [ano, mes] = fim.split("-").map(Number);
  const m = mes === 12 ? 1 : mes + 1;
  return `${mes === 12 ? ano : ano - 1}-${String(m).padStart(2, "0")}`;
}

// 94,6 por 100 mil -> "≈ 1 a cada 1.060 moradores"
export function umACada(taxaPor100mil: number): string | null {
  if (!(taxaPor100mil > 0)) return null;
  const n = 100_000 / taxaPor100mil;
  const arred = n >= 1000 ? Math.round(n / 10) * 10 : Math.round(n);
  return `≈ 1 a cada ${arred.toLocaleString("pt-BR")} moradores`;
}
