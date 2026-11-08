import malhaJson from "./malha.json";

type Nome = { texto: string; x: number; y: number; rot?: number };

export type Malha = {
  largura: number;
  altura: number;
  agua: string;
  rs: string;
  nomesAgua: Nome[];
  nomesTerra: Nome[];
  mini: { largura: number; altura: number; rs: string; litoral: string };
  // ax/ay: ponto na costa onde nasce a linha de chamada; lx/ly: início do rótulo no mar.
  municipios: { cod: string; nome: string; d: string; cx: number; cy: number; ax: number; ay: number; lx: number; ly: number }[];
};

export const malha = malhaJson as Malha;

type RGB = [number, number, number];

// Verdes da restinga: contrastam com o mar azul-escuro e com a areia.
const SEQ: RGB[] = [[228, 238, 196], [132, 188, 126], [28, 102, 74]];
const NEG: RGB[] = [[244, 205, 196], [192, 57, 43]];

function misturar(a: RGB, b: RGB, t: number): RGB {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function rgb(c: RGB): string {
  return `rgb(${Math.round(c[0])} ${Math.round(c[1])} ${Math.round(c[2])})`;
}

function escalar(pontos: RGB[], t: number): RGB {
  const x = Math.min(1, Math.max(0, t)) * (pontos.length - 1);
  const i = Math.min(pontos.length - 2, Math.floor(x));
  return misturar(pontos[i], pontos[i + 1], x - i);
}

// Escala sequencial (restinga clara → mata escura). Com valores negativos, vira divergente: coral abaixo de zero, verde-mar acima.
export function corDoValor(valor: number, min: number, max: number): string {
  if (min < 0 && valor < 0) return rgb(escalar(NEG, Math.min(1, Math.abs(valor) / Math.abs(min))));
  const base = min < 0 ? 0 : min;
  const t = max === base ? 0.5 : (valor - base) / (max - base);
  return rgb(escalar(SEQ, 0.08 + t * 0.92));
}

// Cor do texto legível sobre a cor de preenchimento da escala.
export function escuro(valor: number, min: number, max: number): boolean {
  if (min < 0 && valor < 0) return Math.abs(valor) / Math.abs(min) > 0.5;
  const base = min < 0 ? 0 : min;
  const t = max === base ? 0.5 : (valor - base) / (max - base);
  return t > 0.4;
}

// Ordem de norte a sul, a partir do centro de cada município no mapa.
export function ordemNorteSul(): Record<string, number> {
  const ordenados = [...malha.municipios].sort((a, b) => a.cy - b.cy);
  return Object.fromEntries(ordenados.map((m, i) => [m.cod, i]));
}
