import { expect, test } from "@playwright/test";

test.beforeEach(async ({ context }) => {
  await context.addCookies([
    { name: "liccont_demo_perfil", value: "administrador", url: "http://localhost:3200" },
    { name: "liccont_secretaria", value: "de100000-0000-0000-0000-000000000004", url: "http://localhost:3200" },
  ]);
});

for (const rota of ["/relatorios", "/importados", "/configuracoes/tce", "/equipe/integracoes"]) {
  test(`${rota} responde 404`, async ({ request }) => {
    expect((await request.get(rota)).status()).toBe(404);
  });
}

test("menu sem Relatórios nem Importados do TCE; importação de acervo segue", async ({ page }) => {
  await page.goto("/inicio");
  await expect(page.getByRole("link", { name: "Relatórios" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Importados do TCE/ })).toHaveCount(0);
  expect((await page.request.get("/cadastro/importar")).status()).toBe(200);
});
