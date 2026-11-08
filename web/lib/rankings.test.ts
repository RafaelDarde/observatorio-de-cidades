import { describe, expect, it } from "vitest";
import { filtrarRanking } from "./rankings";

const UFS = ["RS", "SC", "PR"];
const LINHAS = Array.from({ length: 120 }, (_, i) => ({
  cod: String(1000000 + i), nome: `M${i}`, uf: UFS[i % 3], valor: 120 - i, posicao: i + 1,
}));

describe("filtrarRanking", () => {
  it("filtra por UF mantendo a posição nacional", () => {
    const r = filtrarRanking(LINHAS, { uf: "SC", ordem: "desc", pagina: 1 });
    expect(r.linhas[0]).toMatchObject({ uf: "SC", posicao: 2 });
    expect(r.linhas.every((l) => l.uf === "SC")).toBe(true);
    expect(r.totalPaginas).toBe(1);
  });
  it("asc inverte", () => {
    expect(filtrarRanking(LINHAS, { uf: null, ordem: "asc", pagina: 1 }).linhas[0].posicao).toBe(120);
  });
  it("paginação de 50", () => {
    const r = filtrarRanking(LINHAS, { uf: null, ordem: "desc", pagina: 2 });
    expect(r.linhas).toHaveLength(50);
    expect(r.linhas[0].posicao).toBe(51);
    expect(r.totalPaginas).toBe(3);
  });
  it("página fora do intervalo vira a última válida", () => {
    const r = filtrarRanking(LINHAS, { uf: null, ordem: "desc", pagina: 99 });
    expect(r.pagina).toBe(3);
    expect(r.linhas).toHaveLength(20);
    expect(filtrarRanking(LINHAS, { uf: null, ordem: "desc", pagina: 0 }).pagina).toBe(1);
  });
  it("lista vazia", () => {
    expect(filtrarRanking([], { uf: "RS", ordem: "desc", pagina: 1 })).toEqual({ linhas: [], totalPaginas: 1, pagina: 1 });
  });
});
