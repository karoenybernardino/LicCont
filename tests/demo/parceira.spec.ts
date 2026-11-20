import { expect, test } from "@playwright/test";

// Empresa parceira: o dono vê todas as prefeituras e a Equipe; o funcionário só as alocadas e sem Equipe.
const perfil = (valor: string) => async ({ context }: { context: import("@playwright/test").BrowserContext }) => {
  await context.addCookies([{ name: "liccont_demo_perfil", value: valor, url: "http://localhost:3200" }]);
};

test.describe("dono da empresa parceira", () => {
  test.beforeEach(perfil("parceira_dono"));

  test("vê as 5 prefeituras, a Equipe e o seletor com Todas", async ({ page }) => {
    await page.goto("/parceira");
    await expect(page.getByRole("heading", { name: "Painel", level: 1 })).toBeVisible();
    await expect(page.locator("header select").locator("option").first()).toHaveText("Todas as prefeituras (5)");
    await expect(page.getByRole("link", { name: "Barbalha/CE" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Equipe", exact: true })).toBeVisible();
    await page.goto("/parceira/equipe");
    await expect(page.getByRole("heading", { name: "Pessoas da empresa" })).toBeVisible();
  });
});

test.describe("funcionário da empresa parceira", () => {
  test.beforeEach(perfil("parceira_func"));

  test("vê só as 2 prefeituras alocadas e não abre a Equipe", async ({ page }) => {
    await page.goto("/parceira");
    await expect(page.locator("header select").locator("option").first()).toHaveText("Minhas prefeituras (2)");
    await expect(page.getByRole("link", { name: "Caririaçu/CE" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Barbalha/CE" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Equipe", exact: true })).toHaveCount(0);
    await page.goto("/parceira/equipe");
    await expect(page).toHaveURL(/\/parceira$/);
  });

  test("prefeitura não alocada na URL cai na primeira permitida", async ({ page }) => {
    await page.goto("/parceira/pesquisa?p=de8a0000-0000-0000-0000-000000000003");
    await expect(page.locator("header select")).toHaveValue("de8a0000-0000-0000-0000-000000000001");
  });
});
