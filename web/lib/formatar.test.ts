import { describe, expect, it } from "vitest";
import { formatarPosicao, formatarValor } from "./formatar";

describe("formatarValor", () => {
  it.each([
    [null, "pessoas", "Sem dado"],
    [undefined, "pessoas", "Sem dado"],
    [9876, "pessoas", "9.876"],
    [52400, "pessoas", "52,4 mil"],
    [1332845, "pessoas", "1,3 mi"],
    [2.5e9, "R$", "R$ 2,5 bi"],
    [52400, "R$", "R$ 52,4 mil"],
    [120000, "R$ mil", "R$ 120,0 mi"],
    [3.21, "salarios_minimos", "3,2 SM"],
    [3.21, "%", "+3,2%"],
    [-0.5, "%", "-0,5%"],
    [-1234, "empregos", "-1.234"],
    [812, "empregos", "812"],
    [-1.234, "empregos_por_mil_hab", "-1,2"],
    [-52400, "empregos", "-52,4 mil"],
  ] as const)("%s %s -> %s", (valor, unidade, esperado) => {
    expect(formatarValor(valor, unidade)).toBe(esperado);
  });
});

describe("arredondamento na fronteira das faixas", () => {
  it.each([
    [999999, "pessoas", "1,0 mi"],
    [9999.7, "pessoas", "10,0 mil"],
    [999_960_000, "R$", "R$ 1,0 bi"],
    [-0.04, "empregos_por_mil_hab", "0,0"],
    [-0.04, "%", "+0,0%"],
    [-0.4, "empregos", "0"],
  ] as const)("%s %s -> %s", (valor, unidade, esperado) => {
    expect(formatarValor(valor, unidade)).toBe(esperado);
  });
});

describe("formatarPosicao", () => {
  it("mostra a posição dentro do recorte com o total", () => {
    expect(formatarPosicao({ posicao: 2, total: 16 })).toBe("Nº 2 de 16 municípios");
  });
});
