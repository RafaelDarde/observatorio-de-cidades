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

describe("busca tolerante a apóstrofo e hífen", () => {
  const idx = [
    { cod: "4317103", nome: "Sant'Ana do Livramento", uf: "RS" },
    { cod: "2706307", nome: "Olho d'Água das Flores", uf: "AL" },
    { cod: "2708006", nome: "Pingo-d'Água", uf: "MG" },
  ];
  it.each([
    ["santana do livramento", "4317103"],
    ["sant'ana", "4317103"],
    ["olho dagua", "2706307"],
    ["olho d'agua", "2706307"],
    ["pingo dagua", "2708006"],
    ["pingo-d'agua", "2708006"],
  ])("%s", (q, cod) => {
    expect(buscarMunicipios(idx, q)[0]?.cod).toBe(cod);
  });
});
