import { expect, test } from "@playwright/test";

// Só a equipe LicCONT cadastra secretarias e usuários (no cadastro da prefeitura).
const PREFEITURA = "de000000-0000-0000-0000-000000000001";
const perfil = (valor: string) => async ({ context }: { context: import("@playwright/test").BrowserContext }) => {
  await context.addCookies([
    { name: "liccont_demo_perfil", value: valor, url: "http://localhost:3200" },
    { name: "liccont_secretaria", value: "de100000-0000-0000-0000-000000000004", url: "http://localhost:3200" },
  ]);
};

test.describe("administrador da prefeitura", () => {
  test.beforeEach(perfil("administrador"));

  for (const rota of ["/usuarios", "/secretarias", "/usuarios/de300000-0000-0000-0000-000000000001", "/secretarias/nova", "/secretarias/de100000-0000-0000-0000-000000000004"]) {
    test(`não abre ${rota}`, async ({ page }) => {
      await page.goto(rota);
      await expect(page.getByRole("heading", { name: "Página não encontrada" }).first()).toBeVisible();
      await expect(page.getByRole("button", { name: /^Cadastrar$/ })).toHaveCount(0);
    });
  }

  test("Configurações não lista Usuários nem Secretarias, mas lista Temporalidade", async ({ page }) => {
    await page.goto("/inicio");
    await page.getByRole("button", { name: "Configurações" }).click();
    const lateral = page.locator("aside");
    await expect(lateral.getByRole("link", { name: "Tabela de temporalidade", exact: true })).toBeVisible();
    for (const nome of ["Usuários e perfis", "Secretarias"]) await expect(lateral.getByRole("link", { name: nome, exact: true })).toHaveCount(0);
  });

  test("edita a tabela de temporalidade em Configurações", async ({ page }) => {
    await page.goto("/configuracoes/temporalidade");
    await expect(page.getByRole("heading", { name: "Tabela de temporalidade", level: 1 })).toBeVisible();
  });
});

test.describe("equipe LicCONT", () => {
  test.beforeEach(perfil("equipe"));

  test("vê as abas Secretarias e Usuários no cadastro da prefeitura", async ({ page }) => {
    await page.goto(`/equipe/${PREFEITURA}?aba=secretarias`);
    await expect(page.getByRole("link", { name: "Secretarias", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Usuários", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "+ Nova secretaria" })).toBeVisible();
    await page.goto(`/equipe/${PREFEITURA}?aba=usuarios`);
    await expect(page.getByRole("heading", { name: "Cadastrar usuário" })).toBeVisible();
  });

  test("a aba de marca não traz mais o editor de temporalidade", async ({ page }) => {
    await page.goto(`/equipe/${PREFEITURA}?aba=marca`);
    await expect(page.getByRole("link", { name: "Abrir a tabela" })).toBeVisible();
    await page.goto(`/equipe/${PREFEITURA}/temporalidade`);
    await expect(page.getByRole("heading", { name: "Tabela de temporalidade", level: 1 })).toBeVisible();
  });

  test("/usuarios e /secretarias levam para a lista de prefeituras", async ({ page }) => {
    await page.goto("/usuarios");
    await expect(page).toHaveURL(/\/equipe\/prefeituras$/);
    await page.goto("/secretarias");
    await expect(page).toHaveURL(/\/equipe\/prefeituras$/);
  });
});
