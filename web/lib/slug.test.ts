import { describe, expect, it } from "vitest";
import { codDeId, idMunicipio, normalizar, slug } from "./normalizar";

describe("slug e normalização", () => {
  it("slug de nomes com apóstrofo e hífen", () => {
    expect(slug("Sant'Ana do Livramento")).toBe("santana-do-livramento");
    expect(slug("Pingo-d'Água")).toBe("pingo-dagua");
    expect(slug("Olho d'Água das Flores")).toBe("olho-dagua-das-flores");
  });
  it("id e código", () => {
    expect(idMunicipio("4314902", "Porto Alegre")).toBe("4314902-porto-alegre");
    expect(codDeId("4314902-porto-alegre")).toBe("4314902");
  });
  it("normaliza", () => {
    expect(normalizar("  São JOSÉ ")).toBe("sao jose");
  });
});
