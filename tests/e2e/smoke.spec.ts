import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("página inicial abre em português, com a marca e sem erros de acessibilidade", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/LicCONT/);
  await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
  await expect(page.getByRole("img", { name: "LicCONT" })).toBeVisible();

  const { violations } = await new AxeBuilder({ page }).analyze();
  expect(violations).toEqual([]);
});

test("troca de tema persiste ao recarregar", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  await page.getByRole("button", { name: "Ativar tema escuro" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  const { violations } = await new AxeBuilder({ page }).analyze();
  expect(violations).toEqual([]);
});

test("com o sistema no escuro, o botão oferece o tema claro", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "Ativar tema claro" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.getByRole("button", { name: "Ativar tema escuro" })).toBeVisible();
});

test("respostas trazem os cabeçalhos básicos de segurança", async ({ request }) => {
  const resposta = await request.get("/");
  const h = resposta.headers();
  expect(h["x-frame-options"]).toBe("DENY");
  expect(h["x-content-type-options"]).toBe("nosniff");
  expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(h["strict-transport-security"]).toContain("max-age=63072000");
  expect(h["x-powered-by"]).toBeUndefined();
});
