import { describe, expect, it } from "vitest";
import { faixaDaNota, fraseComparacaoRS, inicioJanela, mesCurto, umACada } from "./violencia";

describe("faixaDaNota", () => {
  it.each([
    [0, "critica"],
    [19.4, "critica"],
    [19.6, "risco_alto"],
    [24.3, "risco_alto"],
    [50, "moderada"],
    [61.6, "segura"],
    [85.2, "muito_segura"],
    [100, "muito_segura"],
  ] as const)("%s -> %s", (nota, faixa) => {
    expect(faixaDaNota(nota).id).toBe(faixa);
  });
});

describe("fraseComparacaoRS", () => {
  it.each([
    [51, "praticamente na média do RS"],
    [24.3, "26 pontos abaixo da média do RS (menos segura)"],
    [76, "26 pontos acima da média do RS (mais segura)"],
  ] as const)("%s -> %s", (nota, frase) => {
    expect(fraseComparacaoRS(nota)).toBe(frase);
  });
});

describe("meses", () => {
  it("formata e calcula o início da janela de 12 meses", () => {
    expect(mesCurto("2026-09")).toBe("set/2026");
    expect(inicioJanela("2026-09")).toBe("2025-10");
    expect(inicioJanela("2025-12")).toBe("2025-01");
  });
});

describe("umACada", () => {
  it.each([
    [94.6, "≈ 1 a cada 1.060 moradores"],
    [62.6, "≈ 1 a cada 1.600 moradores"],
    [1723.3, "≈ 1 a cada 58 moradores"],
    [0, null],
  ] as const)("%s -> %s", (taxa, frase) => {
    expect(umACada(taxa)).toBe(frase);
  });
});
