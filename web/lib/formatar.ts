import type { Posicao } from "./tipos";

// Formatação pt-BR de valores por unidade do catálogo. Sem Intl "currency" (insere espaço especial).

function decimal1(v: number): string {
  return v.toFixed(1).replace(".", ",");
}

function inteiro(v: number): string {
  return Math.round(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// Valor absoluto em forma compacta: 9.876 | 52,4 mil | 1,3 mi | 2,5 bi.
// As faixas comparam com o valor já arredondado (999.999 vira "1,0 mi", não "1000,0 mil").
function compacto(abs: number): string {
  if (abs >= 999_950_000) return `${decimal1(abs / 1e9)} bi`;
  if (abs >= 999_950) return `${decimal1(abs / 1e6)} mi`;
  if (abs >= 9_999.5) return `${decimal1(abs / 1e3)} mil`;
  return inteiro(abs);
}

const DECIMAIS = new Set(["salarios_minimos", "%", "empregos_por_mil_hab", "por_100mil_hab"]);

// Valores que arredondam para zero não levam sinal negativo ("-0,0").
function ehZero(abs: number, unidade: string): boolean {
  return DECIMAIS.has(unidade) ? abs < 0.05 : Math.round(abs) === 0;
}

export function formatarValor(valor: number | null | undefined, unidade: string): string {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return "Sem dado";
  const abs = Math.abs(valor);
  const negativo = valor < 0 && !ehZero(abs, unidade);
  const sinal = negativo ? "-" : "";
  switch (unidade) {
    case "R$":
      return `${sinal}R$ ${compacto(abs)}`;
    case "R$ mil":
      return `${sinal}R$ ${compacto(abs * 1000)}`;
    case "salarios_minimos":
      return `${sinal}${decimal1(abs)} SM`;
    case "%":
      return `${negativo ? "-" : "+"}${decimal1(abs)}%`;
    case "empregos_por_mil_hab":
    case "por_100mil_hab":
      return `${sinal}${decimal1(abs)}`;
    case "nota":
      return `${sinal}${inteiro(abs)}`;
    default:
      return `${sinal}${compacto(abs)}`;
  }
}

export function formatarPosicao(p: Posicao): string {
  return `Nº ${p.posicao.toLocaleString("pt-BR")} de ${p.total.toLocaleString("pt-BR")} municípios`;
}
