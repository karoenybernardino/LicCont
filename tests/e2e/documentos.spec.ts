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
  await page.getByLabel("Número do processo").fill(numero);
  await page.getByLabel("Objeto").fill(objeto);
  await page.getByLabel("Ano", { exact: true }).fill("2024");
  await page.getByLabel("Rua", { exact: true }).selectOption({ index: 1 });
  await page.getByRole("button", { name: "Próxima livre" }).click();
  await expect(page.getByText("cabem cerca de")).toBeVisible();
}

test("o operador cadastra com PDF, vê a miniatura e abre o visualizador", async ({ page }) => {
  test.setTimeout(150_000);
  await entrar(page, { email: USUARIOS.operadorDocs.email, secretaria: "Saúde" });
  await page.getByRole("link", { name: "Cadastrar documento" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Cadastrar documento" })).toBeVisible();
  await semFalhasDeAcessibilidade(page);
  await preencher(page, "901/2024", "Aquisição fictícia de teste do PDF");
  await page.getByLabel("Escolher o PDF").setInputFiles(PDF);
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Pregão Eletrônico 901/2024" }))
    .toBeVisible({ timeout: 60_000 })
    .catch(async (e) => {
      const avisos = await page.locator('[role="alert"], [role="status"]').allInnerTexts();
      throw new Error(`${page.url()} :: ${JSON.stringify(avisos)} :: ${e.message.slice(0, 80)}`);
    });
  await expect(page.getByText("3 páginas")).toBeVisible();
  await expect(page.getByRole("img", { name: "Primeira página do PDF" })).toBeVisible();
  await semFalhasDeAcessibilidade(page);

  // Baixar original: o mesmo arquivo (mesmo SHA-256).
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Baixar original" }).click()]);
  const bytes = readFileSync((await download.path())!);
  expect(createHash("sha256").update(bytes).digest("hex")).toBe(createHash("sha256").update(readFileSync(PDF)).digest("hex"));

  await page.getByRole("link", { name: "Abrir PDF" }).click();
  await expect(page.getByRole("toolbar", { name: "Controles do PDF" })).toBeVisible();
  await expect(page.getByText("/ 3")).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "Próxima página" }).click();
  await expect(page.getByRole("img", { name: "Página 2 de 3" })).toBeVisible();
  await page.getByRole("button", { name: "Aumentar o zoom" }).click();
  await semFalhasDeAcessibilidade(page);
});

test("um arquivo que não é PDF, só com o nome trocado, é recusado", async ({ page }) => {
  await entrar(page, { email: USUARIOS.operadorDocs.email, secretaria: "Saúde" });
  await page.goto("/documentos/novo");
  await page.getByLabel("Escolher o PDF").setInputFiles({ name: "falso.pdf", mimeType: "application/pdf", buffer: Buffer.from("isto nao e um pdf") });
  await expect(page.getByRole("alert")).toContainText("O arquivo não é um PDF.");
});

test("a pesquisa filtra por abas e filtros, e o filtro fica na URL", async ({ page }) => {
  await entrar(page, { email: USUARIOS.adminEstrutura.email, secretaria: "Saúde" });
  await page.getByRole("link", { name: "Pesquisa", exact: true }).click();
  await semFalhasDeAcessibilidade(page);
  await expect(page.getByRole("status").filter({ hasText: "documentos encontrados" })).toBeVisible();
  const todos = await page.getByRole("link", { name: /^Todos/ }).innerText();
  expect(Number(todos.replace(/\D/g, ""))).toBeGreaterThanOrEqual(30);

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
  await expect(page.getByRole("link", { name: "Cadastrar documento" })).toHaveCount(0);
  await page.goto("/documentos/novo");
  await expect(page).toHaveURL(/\/pesquisa$/);
  await page.getByRole("link", { name: /Pregão Eletrônico/ }).first().click();
  await expect(page.getByRole("button", { name: "Marcar como conferido" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Editar" })).toHaveCount(0);
});

test("o operador de Obras não acha documento da Saúde", async ({ page }) => {
  await entrar(page, { email: USUARIOS.operadorObras.email, secretaria: "Obras" });
  await page.goto("/pesquisa?q=901/2024");
  await expect(page.getByText("Nenhum documento encontrado")).toBeVisible();
});
