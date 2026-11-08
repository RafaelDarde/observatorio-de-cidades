// Carregamento de JSON no cliente, com checagem de status.
import type { IndiceMunicipios } from "./tipos";

export async function buscarJson<T>(url: string): Promise<T> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Falha ao carregar ${url}: HTTP ${r.status}`);
  return (await r.json()) as T;
}

// O índice (~5.570 municípios) é baixado uma vez e reaproveitado; uma falha libera nova tentativa.
let indiceCache: Promise<IndiceMunicipios> | null = null;
export function carregarIndice(): Promise<IndiceMunicipios> {
  indiceCache ??= buscarJson<IndiceMunicipios>("/dados/municipios.json").catch((erro) => {
    indiceCache = null;
    throw erro;
  });
  return indiceCache;
}
