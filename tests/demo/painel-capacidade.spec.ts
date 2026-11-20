import { expect, test } from "@playwright/test";

test.beforeEach(async ({ context }) => {
  await context.addCookies([
    { name: "liccont_demo_perfil", value: "administrador", url: "http://localhost:3200" },
    { name: "liccont_secretaria", value: "de100000-0000-0000-0000-000000000004", url: "http://localhost:3200" },
  ]);
});

test("painel mostra a capacidade do arquivo em caixas", async ({ page }) => {
  await page.goto("/painel");
  await expect(page.getByRole("heading", { name: "Capacidade do arquivo" })).toBeVisible();
  await expect(page.getByText(/de 1\.440 caixas ocupadas/)).toBeVisible();
  await expect(page.getByText("40 módulos × 36 caixas por módulo")).toBeVisible();
  await expect(page.getByTestId("capacidade-percentual")).toHaveText(/^\d+%$/);
  await expect(page.getByRole("img", { name: /^Rua A: \d+% ocupado$/ })).toBeVisible();
});
