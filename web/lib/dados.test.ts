import { describe, expect, it } from "vitest";
import { lerCatalogo, lerIndice, lerMeta, lerPerfil } from "./dados";

describe("leitura de dados", () => {
  it("perfil inexistente é null", () => {
    expect(lerPerfil("0000000")).toBeNull();
  });
  it("lê o perfil", () => {
    expect(lerPerfil("4314902")?.nome).toBe("Porto Alegre");
  });
  it("lê o índice", () => {
    expect(lerIndice()).toHaveLength(3);
  });
  it("lê catálogo e meta", () => {
    expect(lerCatalogo()[0].id).toBe("populacao");
    expect(Object.keys(lerMeta().fontes)).toContain("ibge_populacao");
  });
});
