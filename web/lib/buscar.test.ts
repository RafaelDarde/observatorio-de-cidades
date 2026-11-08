import { describe, expect, it } from "vitest";
import { buscarMunicipios } from "./buscar";

const INDICE = [
  { cod: "4314902", nome: "Porto Alegre", uf: "RS" },
  { cod: "9999991", nome: "Bom Jesus de São José", uf: "PR" },
  { cod: "3549904", nome: "São José dos Campos", uf: "SP" },
  { cod: "4216602", nome: "São José", uf: "SC" },
  { cod: "3549805", nome: "São José do Rio Preto", uf: "SP" },
];

describe("buscarMunicipios", () => {
  it("prefixo antes de 'contém', alfabético em cada grupo, ignorando acento", () => {
    expect(buscarMunicipios(INDICE, "sao jose").map((m) => m.nome)).toEqual([
      "São José", "São José do Rio Preto", "São José dos Campos", "Bom Jesus de São José",
    ]);
  });
  it("consulta curta não busca", () => {
    expect(buscarMunicipios(INDICE, "s")).toEqual([]);
    expect(buscarMunicipios(INDICE, "  ")).toEqual([]);
  });
  it("maiúsculas", () => {
    expect(buscarMunicipios(INDICE, "PORTO")[0].cod).toBe("4314902");
  });
  it("limite", () => {
    expect(buscarMunicipios(INDICE, "sao", 2)).toHaveLength(2);
  });
  it("mesmo nome em UFs diferentes ordena por UF", () => {
    const idx = [{ cod: "1", nome: "Bonito", uf: "PA" }, { cod: "2", nome: "Bonito", uf: "BA" }];
    expect(buscarMunicipios(idx, "bonito").map((m) => m.uf)).toEqual(["BA", "PA"]);
  });
});
