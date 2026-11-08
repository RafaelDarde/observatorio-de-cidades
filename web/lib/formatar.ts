// Formatação pt-BR de valores por unidade do catálogo. Sem Intl "currency" (insere espaço especial).

function decimal1(v: number): string {
  return v.toFixed(1).replace(".", ",");
}

function inteiro(v: number): string {
  return Math.round(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// Valor absoluto em forma compacta: 9.876 | 52,4 mil | 1,3 mi | 2,5 bi
function compacto(abs: number): string {
  if (abs >= 1e9) return `${decimal1(abs / 1e9)} bi`;
  if (abs >= 1e6) return `${decimal1(abs / 1e6)} mi`;
  if (abs >= 1e4) return `${decimal1(abs / 1e3)} mil`;
  return inteiro(abs);
}

export function formatarValor(valor: number | null | undefined, unidade: string): string {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return "Sem dado";
  const sinal = valor < 0 ? "-" : "";
  const abs = Math.abs(valor);
  switch (unidade) {
    case "R$":
      return `${sinal}R$ ${compacto(abs)}`;
    case "R$ mil":
      return `${sinal}R$ ${compacto(abs * 1000)}`;
    case "salarios_minimos":
      return `${sinal}${decimal1(abs)} SM`;
    case "%":
      return `${valor < 0 ? "-" : "+"}${decimal1(abs)}%`;
    case "empregos_por_mil_hab":
      return `${sinal}${decimal1(abs)}`;
    default:
      return `${sinal}${compacto(abs)}`;
  }
}
