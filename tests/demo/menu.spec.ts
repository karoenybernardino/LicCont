import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.beforeEach(async ({ context }) => {
  await context.addCookies([
    { name: "liccont_demo_perfil", value: "administrador", url: "http://localhost:3200" },
    { name: "liccont_secretaria", value: "de100000-0000-0000-0000-000000000004", url: "http://localhost:3200" },
  ]);
});

for (const tema of ["light", "dark"] as const) {
  test(`aba do menu no tema ${tema}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: tema });
    await page.goto("/inicio");
    const link = page.getByRole("link", { name: "Pesquisa", exact: true });
    await link.hover();
    const dica = page.getByRole("tooltip");
    await expect(dica).toContainText("Pesquisa");
    await expect(link).toHaveAttribute("aria-describedby", (await dica.getAttribute("id"))!);
    await page.mouse.move(600, 400);
    await expect(dica).toHaveCount(0);
    // teclado: foco abre, Esc fecha, foco continua no item
    await link.focus();
    await expect(dica).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dica).toHaveCount(0);
    await expect(link).toBeFocused();
    await link.focus();
    await page.getByRole("link", { name: "Mapa 3D", exact: true }).focus();
    await expect(dica).toContainText("Mapa 3D");
    expect((await new AxeBuilder({ page }).include("aside").analyze()).violations).toEqual([]);
  });

  test(`Configurações agrupa os ajustes no tema ${tema}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: tema });
    await page.goto("/inicio");
    // fora de Configurações, o menu não traz os itens soltos
    for (const nome of ["Usuários e perfis", "Secretarias", "Acesso de suporte", "Exportar dados"]) {
      await expect(page.locator("aside").getByRole("link", { name: nome, exact: true })).toHaveCount(0);
    }
    const botao = page.getByRole("button", { name: "Configurações" });
    await expect(botao).toHaveAttribute("aria-expanded", "false");
    await botao.click();
    await expect(botao).toHaveAttribute("aria-expanded", "true");
    for (const nome of ["Usuários e perfis", "Secretarias", "Importação do TCE", "Acesso de suporte", "Exportar dados"]) {
      await expect(page.locator("aside").getByRole("link", { name: nome, exact: true })).toBeVisible();
    }
    expect((await new AxeBuilder({ page }).include("aside").analyze()).violations).toEqual([]);
    await page.keyboard.press("Escape");
    await expect(botao).toHaveAttribute("aria-expanded", "false");
    await expect(botao).toBeFocused();
    await botao.click();
    await page.locator("aside").getByRole("link", { name: "Secretarias", exact: true }).click();
    await expect(page).toHaveURL(/\/secretarias$/);
  });
}
