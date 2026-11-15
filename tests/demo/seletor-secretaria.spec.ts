import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.beforeEach(async ({ context }) => {
  await context.addCookies([
    { name: "liccont_demo_perfil", value: "administrador", url: "http://localhost:3200" },
    { name: "liccont_secretaria", value: "de100000-0000-0000-0000-000000000004", url: "http://localhost:3200" },
  ]);
});

for (const tema of ["light", "dark"] as const) {
  test(`seletor de secretaria legível e acessível no tema ${tema}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: tema });
    await page.goto("/inicio");
    const botao = page.locator("#secretaria-em-uso");
    await expect(botao).toHaveAttribute("aria-haspopup", "listbox");
    await botao.click();
    const lista = page.getByRole("listbox");
    await expect(lista.getByRole("option")).not.toHaveCount(0);
    // fundo e texto precisam contrastar (nunca branco sobre cinza claro)
    const [fundo, texto] = await lista.getByRole("option").first().evaluate((el) => [
      getComputedStyle(el.parentElement!).backgroundColor,
      getComputedStyle(el).color,
    ]);
    expect(fundo).not.toBe(texto);
    expect((await new AxeBuilder({ page }).include("#secretaria-em-uso").include("#lista-secretaria").analyze()).violations).toEqual([]);
    await page.keyboard.press("Escape");
    await expect(lista).toHaveCount(0);
    await botao.click();
    await page.mouse.click(5, 600);
    await expect(lista).toHaveCount(0);
    await botao.focus();
    await page.keyboard.press("ArrowDown");
    await expect(lista).toBeVisible();
  });
}
