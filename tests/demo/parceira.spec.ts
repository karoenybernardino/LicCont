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
    await page.getByRole("combobox", { name: /Prefeitura/ }).click();
    await expect(page.getByRole("listbox", { name: /Prefeitura/ }).getByRole("option").first()).toHaveText("Todas as prefeituras (5)");
    await expect(page.getByRole("link", { name: "Barbalha/CE" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Equipe", exact: true })).toBeVisible();
    await page.goto("/parceira/equipe");
    await expect(page.getByRole("heading", { name: "Pessoas da empresa" })).toBeVisible();
  });
});

test.describe("dono da empresa parceira nas telas completas", () => {
  test.beforeEach(perfil("parceira_dono"));

  test("menu com as telas da prefeitura e sem Usuários/Secretarias", async ({ page }) => {
    await page.goto("/parceira");
    for (const nome of ["Mapa 3D", "Cadastrar", "Etiquetas", "Estrutura física", "Temporalidade"]) {
      await expect(page.getByRole("link", { name: nome, exact: true })).toBeVisible();
    }
    await expect(page.getByRole("link", { name: "Usuários" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Secretarias" })).toHaveCount(0);
  });

  test("abre o mapa 3D completo, o cadastro com as duas abas e as etiquetas", async ({ page }) => {
    await page.goto("/mapa");
    await expect(page.getByRole("heading", { name: "Mapa 3D do galpão", level: 1 })).toBeVisible();
    await expect(page.locator("canvas").first()).toBeVisible();
    await page.goto("/documentos/novo");
    await expect(page.getByRole("link", { name: "Cadastro detalhado" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Cadastro geral" })).toBeVisible();
    await page.goto("/etiquetas");
    await expect(page.getByRole("heading", { name: "Etiquetas", level: 1 })).toBeVisible();
  });

  test("/usuarios responde fechado e empréstimos voltam ao painel", async ({ page }) => {
    await page.goto("/usuarios");
    await expect(page.getByText("ERRO 404")).toBeVisible();
    await page.goto("/emprestimos");
    await expect(page).toHaveURL(/\/parceira$/);
  });

  test("telas enxutas antigas redirecionam", async ({ page }) => {
    await page.goto("/parceira/mapa");
    await expect(page).toHaveURL(/\/mapa$/);
  });
});

test.describe("funcionário da empresa parceira", () => {
  test.beforeEach(perfil("parceira_func"));

  test("vê só as 2 prefeituras alocadas e não abre a Equipe", async ({ page }) => {
    await page.goto("/parceira");
    await page.getByRole("combobox", { name: /Prefeitura/ }).click();
    await expect(page.getByRole("listbox", { name: /Prefeitura/ }).getByRole("option").first()).toHaveText("Minhas prefeituras (2)");
    await expect(page.getByRole("link", { name: "Caririaçu/CE" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Barbalha/CE" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Equipe", exact: true })).toHaveCount(0);
    await page.goto("/parceira/equipe");
    await expect(page).toHaveURL(/\/parceira$/);
  });

  test("prefeitura não alocada na URL cai na primeira permitida", async ({ page }) => {
    await page.context().addCookies([{ name: "liccont_parceira_pref", value: "de8a0000-0000-0000-0000-000000000003", url: "http://localhost:3200" }]);
    await page.goto("/mapa");
    await page.getByRole("combobox", { name: /Prefeitura/ }).click();
    await expect(page.getByRole("listbox", { name: /Prefeitura/ }).getByRole("option").first()).toHaveAttribute("aria-selected", "true");
  });
});
