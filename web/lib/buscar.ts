import { normalizar } from "./normalizar";
import type { IndiceMunicipios } from "./tipos";

type Item = IndiceMunicipios[number];

const ordem = (a: Item, b: Item) => a.nome.localeCompare(b.nome, "pt-BR") || a.uf.localeCompare(b.uf);

export function buscarMunicipios(indice: IndiceMunicipios, consulta: string, limite = 10): Item[] {
  const q = normalizar(consulta);
  if (q.length < 2) return [];
  const comeca: Item[] = [];
  const contem: Item[] = [];
  for (const m of indice) {
    const nome = normalizar(m.nome);
    if (nome.startsWith(q)) comeca.push(m);
    else if (nome.includes(q)) contem.push(m);
  }
  return [...comeca.sort(ordem), ...contem.sort(ordem)].slice(0, limite);
}
