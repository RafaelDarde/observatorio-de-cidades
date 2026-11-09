import { describe, expect, it } from "vitest";
import { faixaDoIndice, frasePosicaoRS } from "./violencia";

describe("faixaDoIndice", () => {
  it.each([
    [41, "baixa"],
    [74.9, "baixa"],
    [75, "moderada"],
    [124.9, "moderada"],
    [125, "alta"],
    [175, "muito_alta"],
    [334, "muito_alta"],
  ] as const)("%s -> %s", (valor, faixa) => {
    expect(faixaDoIndice(valor).id).toBe(faixa);
  });
});

describe("frasePosicaoRS", () => {
  it.each([
    [100, "praticamente igual à média do RS"],
    [186, "1,9 vezes a média do RS"],
    [41, "59% abaixo da média do RS"],
  ] as const)("%s -> %s", (valor, frase) => {
    expect(frasePosicaoRS(valor)).toBe(frase);
  });
});
