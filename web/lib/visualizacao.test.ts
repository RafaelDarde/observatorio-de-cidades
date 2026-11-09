import { describe, expect, it } from "vitest";
import { tipoVisualizacao } from "./visualizacao";

const p = (periodo: string, valor: number) => ({ periodo, valor });

describe("tipoVisualizacao", () => {
  it("null é vazio", () => {
    expect(tipoVisualizacao(null)).toBe("vazio");
  });
  it("sem série e sem último é vazio", () => {
    expect(tipoVisualizacao({ serie: [], ultimo: null, posicao: null })).toBe("vazio");
  });
  it("com recortes é barras", () => {
    expect(
      tipoVisualizacao({ serie: [p("2024", 1)], ultimo: p("2024", 1), posicao: null, por_recorte: [{ recorte: "A", valor: 1 }] }),
    ).toBe("barras");
  });
  it("série com 2+ pontos é linha, mesmo sem último (histórico mantido)", () => {
    expect(tipoVisualizacao({ serie: [p("2023", 1), p("2024", 2)], ultimo: null, posicao: null })).toBe("linha");
  });
  it("um ponto só é cartão", () => {
    expect(tipoVisualizacao({ serie: [p("2024", 1)], ultimo: p("2024", 1), posicao: null })).toBe("cartao");
  });
  it("recorte vazio não conta como barras", () => {
    expect(tipoVisualizacao({ serie: [p("2024", 1)], ultimo: p("2024", 1), posicao: null, por_recorte: [] })).toBe("cartao");
  });
});

import { fonteDoIndicador } from "./visualizacao";

describe("fonteDoIndicador", () => {
  it.each([
    ["populacao", "ibge_populacao"],
    ["populacao_var_censo", "derivado"],
    ["pib", "ibge_pib"],
    ["vab_agro", "ibge_pib"],
    ["pib_per_capita", "derivado"],
    ["cempre_pessoal_ocupado", "ibge_cempre"],
    ["caged_saldo", "caged"],
    ["seg_cvli", "ssp_rs"],
    ["seg_taxa_cvli", "derivado"],
    ["seg_nota", "derivado"],
    ["seg_nota_veraneio", "derivado"],
    ["caged_saldo_12m", "derivado"],
    ["caged_saldo_12m_por_mil_hab", "derivado"],
  ])("%s -> %s", (id, fonte) => {
    expect(fonteDoIndicador(id)).toBe(fonte);
  });
});
