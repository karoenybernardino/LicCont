import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("tela de entrada abre em português, com a marca e sem erros de acessibilidade", async ({ page }) => {
  await page.goto("/entrar");
  await expect(page).toHaveTitle(/LicCONT/);
  await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
  await expect(page.getByRole("img", { name: "LicCONT" })).toBeVisible();

  const { violations } = await new AxeBuilder({ page }).analyze();
  expect(violations).toEqual([]);
});

test("troca de tema persiste ao recarregar", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/entrar");
  await page.getByRole("button", { name: "Ativar tema escuro" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  const { violations } = await new AxeBuilder({ page }).analyze();
  expect(violations).toEqual([]);
});

test("com o sistema no escuro, o botão oferece o tema claro", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/entrar");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "Ativar tema claro" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.getByRole("button", { name: "Ativar tema escuro" })).toBeVisible();
});

test("segue a marca do canvas: IBM Plex Sans no texto, Sora nos títulos e fundos dos dois temas", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/entrar");
  const estilo = (seletor: string, prop: string) =>
    page.locator(seletor).first().evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), prop);

  expect(await estilo("body", "font-family")).toContain("IBM Plex Sans");
  expect(await estilo("h1", "font-family")).toContain("Sora");
  expect(await estilo("body", "background-color")).toBe("rgb(234, 243, 244)");

  await page.getByRole("button", { name: "Ativar tema escuro" }).click();
  expect(await estilo("body", "background-color")).toBe("rgb(5, 9, 11)");
});

test("respostas trazem os cabeçalhos básicos de segurança", async ({ request }) => {
  const resposta = await request.get("/");
  const h = resposta.headers();
  expect(h["x-frame-options"]).toBe("DENY");
  expect(h["x-content-type-options"]).toBe("nosniff");
  expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(h["strict-transport-security"]).toContain("max-age=63072000");
  expect(h["x-powered-by"]).toBeUndefined();
  // CSP com nonce por requisição (o hash sozinho bloqueia os scripts do Next).
  expect(h["content-security-policy"]).toMatch(/script-src 'self' 'nonce-[A-Za-z0-9+/=]+' 'strict-dynamic'/);
  expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
});

test("a página inicial é pública e leva à tela de entrada", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("O arquivo da prefeitura");
  await page.getByRole("link", { name: "Entrar", exact: true }).first().click();
  await expect(page).toHaveURL(/\/entrar$/);
});

test("política de privacidade e termo de uso abrem sem login", async ({ page }) => {
  for (const [rota, titulo] of [["/privacidade", "Política de privacidade"], ["/termos", "Termo de uso"]]) {
    await page.goto(rota);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(titulo);
  }
});

test("pedido de demonstração recusa e-mail inválido sem gravar", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Nome").fill("Pessoa Fictícia");
  await page.getByLabel("Órgão").fill("Prefeitura Fictícia");
  await page.getByLabel("E-mail").fill("sem-arroba");
  await page.getByRole("button", { name: "Enviar pedido" }).click();
  // O navegador bloqueia o envio por e-mail inválido: continua no formulário.
  await expect(page.getByRole("button", { name: "Enviar pedido" })).toBeVisible();
});

test("nenhum script bloqueado pela CSP", async ({ page }) => {
  const bloqueios: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error" && m.text().includes("Content Security Policy")) bloqueios.push(m.text());
  });
  await page.goto("/entrar");
  await page.getByRole("button", { name: /Ativar tema/ }).click();
  expect(bloqueios).toEqual([]);
});
