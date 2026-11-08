import { afterEach, describe, expect, it, vi } from "vitest";
import { buscarJson, carregarIndice } from "./carregar";

afterEach(() => vi.unstubAllGlobals());

describe("buscarJson", () => {
  it("rejeita resposta não-ok", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("x", { status: 404 })));
    await expect(buscarJson("/dados/x.json")).rejects.toThrow("404");
  });
});

describe("carregarIndice", () => {
  it("depois de uma falha, tenta de novo na próxima chamada", async () => {
    const fetch = vi.fn()
      .mockRejectedValueOnce(new TypeError("rede"))
      .mockResolvedValueOnce(new Response(JSON.stringify([{ cod: "1", nome: "A", uf: "RS" }])));
    vi.stubGlobal("fetch", fetch);
    await expect(carregarIndice()).rejects.toThrow("rede");
    await expect(carregarIndice()).resolves.toHaveLength(1);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
