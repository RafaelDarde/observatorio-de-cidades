// Leitura dos JSONs do pipeline — só no servidor / durante o build.
import fs from "node:fs";
import path from "node:path";
import type { Catalogo, IndiceMunicipios, Meta, Perfil, Ranking } from "./tipos";

function dir(): string {
  return process.env.DADOS_DIR ?? path.join(process.cwd(), "public", "dados");
}

function ler<T>(...partes: string[]): T {
  return JSON.parse(fs.readFileSync(path.join(dir(), ...partes), "utf-8")) as T;
}

export function lerCatalogo(): Catalogo {
  return ler<Catalogo>("catalogo.json");
}

export function lerIndice(): IndiceMunicipios {
  return ler<IndiceMunicipios>("municipios.json");
}

export function lerPerfil(cod: string): Perfil | null {
  if (!/^\d{7}$/.test(cod) || !fs.existsSync(path.join(dir(), "municipios", `${cod}.json`))) return null;
  return ler<Perfil>("municipios", `${cod}.json`);
}

export function lerMeta(): Meta {
  return ler<Meta>("meta.json");
}

export function lerRanking(indicador: string): Ranking {
  return ler<Ranking>("rankings", `${indicador}.json`);
}
