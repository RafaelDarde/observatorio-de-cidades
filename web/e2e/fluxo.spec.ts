import { expect, test } from "@playwright/test";

test("busca, perfil e comparação", async ({ page }) => {
  await page.goto("/");
  const busca = page.getByRole("combobox", { name: "Buscar município" });
  await busca.click();
  await busca.fill("torres");
  await expect(page.getByRole("option").first()).toContainText("Torres");
  await busca.press("Enter");
  await expect(page).toHaveURL(/\/municipio\/4321501-torres/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Torres");
  await expect(page.getByText(/Nº \d+ de 16 municípios/).first()).toBeVisible();

  await page.getByRole("link", { name: "Comparar com…" }).click();
  await expect(page).toHaveURL(/\/comparar\?c=4321501/);
  const adicionar = page.getByRole("combobox", { name: "Buscar município" });
  await adicionar.click();
  await adicionar.fill("tramandai");
  await page.getByRole("option", { name: /Tramandaí/ }).click();
  await expect(page).toHaveURL(/c=4321501,4321600/);
  await expect(page.locator("thead th")).toHaveCount(3);
});

test("município inexistente mostra 404", async ({ page }) => {
  await page.goto("/municipio/0000000-x");
  await expect(page.getByText("Município não encontrado")).toBeVisible();
});

test("só municípios do litoral: busca não acha Porto Alegre e ranking tem 16", async ({ page }) => {
  await page.goto("/");
  const busca = page.getByRole("combobox", { name: "Buscar município" });
  await busca.click();
  await busca.fill("rio");
  await expect(page.getByRole("option").first()).toContainText("Rio Grande");
  await busca.fill("porto alegre");
  await expect(page.getByRole("option")).toHaveCount(0);

  await page.goto("/rankings/populacao");
  await expect(page.getByText("16 municípios")).toBeVisible();
  await expect(page.locator("tbody tr")).toHaveCount(16);
  await expect(page.locator("tbody tr").first()).toContainText("Rio Grande");
});
