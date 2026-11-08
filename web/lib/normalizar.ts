// Normalização de texto para busca e geração de slugs de município.

export function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

// Para busca: ignora apóstrofo e trata hífen como espaço ("santana" acha "Sant'Ana").
export function normalizarBusca(texto: string): string {
  return normalizar(texto).replace(/['’]/g, "").replace(/-/g, " ").replace(/\s+/g, " ");
}

export function slug(nome: string): string {
  return normalizar(nome)
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function idMunicipio(cod: string, nome: string): string {
  return `${cod}-${slug(nome)}`;
}

export function codDeId(id: string): string {
  return id.slice(0, 7);
}
