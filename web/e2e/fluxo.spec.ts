import { expect, test } from "@playwright/test";

test("busca, perfil e comparação", async ({ page }) => {
  await page.goto("/");
  const busca = page.getByRole("combobox", { name: "Buscar município" });
  await busca.click();
  await busca.fill("porto alegre");
  await expect(page.getByRole("option").first()).toContainText("Porto Alegre");
  await busca.press("Enter");
  await expect(page).toHaveURL(/\/municipio\/4314902-porto-alegre/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Porto Alegre");

  await page.getByRole("link", { name: "Comparar com…" }).click();
  await expect(page).toHaveURL(/\/comparar\?c=4314902/);
  const adicionar = page.getByRole("combobox", { name: "Buscar município" });
  await adicionar.click();
  await adicionar.fill("canoas");
  await page.getByRole("option", { name: /Canoas/ }).click();
  await expect(page).toHaveURL(/c=4314902,4304606/);
  await expect(page.locator("thead th")).toHaveCount(3);
});

test("município inexistente mostra 404", async ({ page }) => {
  await page.goto("/municipio/0000000-x");
  await expect(page.getByText("Município não encontrado")).toBeVisible();
});
