import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { USUARIOS, temSupabase } from "./dados";
import { entrar, semFalhasDeAcessibilidade } from "./ajuda";

// Critério 8 de docs/fases/fase-3.md. Usa os 30 documentos do supabase/seed.sql
// (Rua A, todas as secretarias) e o PDF fictício de public/demo. Precisa do
// Supabase local.
test.skip(!temSupabase && !process.env.CI, "sem Supabase local");
test.describe.configure({ mode: "serial", retries: 0 });

const PDF = path.join(process.cwd(), "public", "demo", "documento-de-demonstracao.pdf");

async function preencher(page: Page, numero: string, objeto: string) {
  await page.getByLabel("Modalidade").selectOption("pregao_eletronico");
  await page.getByLabel("Título do processo").fill(numero);
  await page.getByLabel("Objeto").fill(objeto);
  await page.getByLabel("Ano", { exact: true }).fill("2024");
  await page.getByLabel("Rua", { exact: true }).click();
  await page.getByRole("option").first().click();
  await page.getByRole("button", { name: "Próxima livre" }).click();
  await expect(page.getByText("cabem cerca de")).toBeVisible();
}

test("o operador cadastra com PDF, vê a miniatura e abre o visualizador", async ({ page }) => {
  test.setTimeout(150_000);
  await entrar(page, { email: USUARIOS.operadorDocs.email, secretaria: "Saúde" });
  console.log("[docs-e2e] passo 1", new Date().toISOString());
  await page.getByRole("link", { name: "Cadastrar documento" }).first().click();
  console.log("[docs-e2e] passo 2", new Date().toISOString());
  await expect(page.getByRole("heading", { level: 1, name: "Cadastrar documento" })).toBeVisible();
  console.log("[docs-e2e] passo 3", new Date().toISOString());
  await semFalhasDeAcessibilidade(page);
  console.log("[docs-e2e] passo 4", new Date().toISOString());
  await preencher(page, "901/2024", "Aquisição fictícia de teste do PDF");
  console.log("[docs-e2e] passo 5", new Date().toISOString());
  await page.getByLabel("Escolher o PDF").setInputFiles(PDF);
  console.log("[docs-e2e] passo 6", new Date().toISOString());
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  console.log("[docs-e2e] passo 7", new Date().toISOString());
  await expect(page.getByRole("heading", { level: 1, name: "Pregão Eletrônico 901/2024" }))
    .toBeVisible({ timeout: 60_000 })
    .catch(async (e) => {
      const avisos = await page.locator('[role="alert"], [role="status"]').allInnerTexts();
      throw new Error(`${page.url()} :: ${JSON.stringify(avisos)} :: ${e.message.slice(0, 80)}`);
    });
  await expect(page.getByText("3 páginas")).toBeVisible();
  console.log("[docs-e2e] passo 8", new Date().toISOString());
  await expect(page.getByRole("img", { name: "Primeira página do PDF" })).toBeVisible();
  console.log("[docs-e2e] passo 9", new Date().toISOString());
  await semFalhasDeAcessibilidade(page);
  console.log("[docs-e2e] passo 10", new Date().toISOString());

  // Baixar original: o mesmo arquivo (mesmo SHA-256).
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Baixar original" }).click()]);
  const bytes = readFileSync((await download.path())!);
  expect(createHash("sha256").update(bytes).digest("hex")).toBe(createHash("sha256").update(readFileSync(PDF)).digest("hex"));

  await page.getByRole("link", { name: "Abrir PDF" }).click();
  console.log("[docs-e2e] passo 11", new Date().toISOString());
  await expect(page.getByRole("toolbar", { name: "Controles do PDF" })).toBeVisible();
  console.log("[docs-e2e] passo 12", new Date().toISOString());
  await expect(page.getByText("de 3", { exact: true })).toBeVisible({ timeout: 30_000 });
  console.log("[docs-e2e] passo 13", new Date().toISOString());
  await page.getByRole("button", { name: "Próxima página" }).click();
  console.log("[docs-e2e] passo 14", new Date().toISOString());
  await expect(page.getByRole("img", { name: "Página 2 de 3" })).toBeVisible();
  console.log("[docs-e2e] passo 15", new Date().toISOString());
  await page.getByRole("button", { name: "Aumentar o zoom" }).click();
  console.log("[docs-e2e] passo 16", new Date().toISOString());
  await semFalhasDeAcessibilidade(page);
  console.log("[docs-e2e] passo 17", new Date().toISOString());
});

test("um arquivo que não é PDF, só com o nome trocado, é recusado", async ({ page }) => {
  test.setTimeout(90_000);
  await entrar(page, { email: USUARIOS.operadorDocs.email, secretaria: "Saúde" });
  await page.getByRole("link", { name: "Cadastrar documento" }).first().click();
  await expect(page.getByRole("heading", { level: 1, name: "Cadastrar documento" })).toBeVisible();
  await page.getByLabel("Escolher o PDF").setInputFiles({ name: "falso.pdf", mimeType: "application/pdf", buffer: Buffer.from("isto nao e um pdf") });
  await expect(page.getByRole("alert").filter({ hasText: "O arquivo não é um PDF." })).toBeVisible();
});

test("a pesquisa filtra por abas e filtros, e o filtro fica na URL", async ({ page }) => {
  await entrar(page, { email: USUARIOS.operadorDocs.email, secretaria: "Saúde" });
  await page.getByRole("link", { name: "Pesquisa", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Pesquisa" })).toBeVisible();
  await semFalhasDeAcessibilidade(page);
  await expect(page.getByRole("status").filter({ hasText: "documentos encontrados" })).toBeVisible();
  const todos = await page.getByRole("link", { name: /^Todos/ }).innerText();
  expect(Number(todos.replace(/\D/g, ""))).toBeGreaterThanOrEqual(1);

  await page.getByLabel("Buscar").fill("901/2024");
  await page.getByRole("button", { name: "Pesquisar" }).click();
  await expect(page).toHaveURL(/q=901%2F2024/);
  await expect(page.getByRole("link", { name: /Pregão Eletrônico 901\/2024/ })).toBeVisible();

  await page.getByRole("link", { name: "Limpar" }).click();
  await expect(page).toHaveURL(/\/pesquisa$/);
  await page.goto("/pesquisa?aba=licitacao&de=2020");
  await expect(page.getByRole("link", { name: /^Licitações/ })).toHaveAttribute("aria-current", "page");
  await expect(page.getByLabel("Ano inicial")).toHaveValue("2020");
});

test("Consulta pesquisa e abre o documento, mas não cadastra", async ({ page }) => {
  await entrar(page, { email: USUARIOS.consultaDocs.email, secretaria: "Saúde" });
  await expect(page).toHaveURL(/\/inicio$/);
  await expect(page.getByRole("link", { name: "Cadastrar documento" })).toHaveCount(0);
  await page.goto("/documentos/novo");
  await expect(page).toHaveURL(/\/pesquisa$/);
  await page.getByRole("link", { name: /Pregão Eletrônico/ }).first().click();
  await expect(page.getByRole("button", { name: "Marcar como conferido" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Editar" })).toHaveCount(0);
});

test("o operador de Obras não acha documento da Saúde", async ({ page }) => {
  await entrar(page, { email: USUARIOS.operadorObras.email, secretaria: "Obras" });
  await expect(page).toHaveURL(/\/inicio$/);
  await page.goto("/pesquisa?q=901/2024");
  await expect(page.getByText("Nenhum documento encontrado")).toBeVisible();
});
