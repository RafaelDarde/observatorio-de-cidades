import { describe, expect, it } from "vitest";
import { montarUrl, parseCodigos } from "./comparar";

const v = new Set(["4314902", "4305108", "4316907", "4304606"]);

describe("parseCodigos", () => {
  it("parâmetro ausente ou vazio", () => {
    expect(parseCodigos(null, v)).toEqual({ validos: [], invalidos: [] });
    expect(parseCodigos("", v)).toEqual({ validos: [], invalidos: [] });
  });
  it("tira duplicatas e espaços", () => {
    expect(parseCodigos("4314902,4314902, 4305108", v)).toEqual({ validos: ["4314902", "4305108"], invalidos: [] });
  });
  it("no máximo 3 válidos e lista inválidos", () => {
    expect(parseCodigos("4314902,abc,4305108,4316907,4304606", v)).toEqual({
      validos: ["4314902", "4305108", "4316907"],
      invalidos: ["abc"],
    });
  });
  it("vírgulas sobrando", () => {
    expect(parseCodigos(",4314902,,", v)).toEqual({ validos: ["4314902"], invalidos: [] });
  });
});

describe("montarUrl", () => {
  it("monta a URL", () => {
    expect(montarUrl(["4314902", "4304606"])).toBe("/comparar?c=4314902,4304606");
    expect(montarUrl([])).toBe("/comparar");
  });
});

import { seriesComparacao } from "./comparar";

describe("seriesComparacao", () => {
  it("municípios homônimos têm chaves e rótulos distintos", () => {
    const perfil = (cod: string, uf: string) => ({
      cod, nome: "Bom Jesus", uf, regiao: "x",
      indicadores: { pib: { serie: [{ periodo: "2023", valor: Number(cod) }], ultimo: null, posicao: null } },
    });
    const s = seriesComparacao([perfil("2201903", "PI"), perfil("4302352", "RS")], "pib");
    expect(s.map((x) => x.chave)).toEqual(["2201903", "4302352"]);
    expect(s.map((x) => x.nome)).toEqual(["Bom Jesus – PI", "Bom Jesus – RS"]);
    expect(s[1].serie[0].valor).toBe(4302352);
  });
});
