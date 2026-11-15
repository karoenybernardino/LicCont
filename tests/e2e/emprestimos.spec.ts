import { expect, test } from "@playwright/test";
import { USUARIOS, temSupabase } from "./dados";
import { entrar } from "./ajuda";

// Fase 6: registrar, achar "Emprestado" na pesquisa e devolver. Usa os documentos
// fictícios do supabase/seed.sql. Precisa do Supabase local.
test.skip(!temSupabase && !process.env.CI, "sem Supabase local");
test.describe.configure({ mode: "serial", retries: 0 });

test("o operador registra um empréstimo, vê Emprestado na pesquisa e devolve", async ({ page }) => {
  test.setTimeout(90_000);
  await entrar(page, { email: USUARIOS.operadorDocs.email, secretaria: "Saúde" });
  await page.goto("/emprestimos");
  await expect(page.getByRole("heading", { level: 1, name: "Empréstimos e devoluções" })).toBeVisible();

  const seletor = page.locator('select[name="documento"]');
  const opcao = seletor.locator("option").nth(1);
  const [valor, texto] = [await opcao.getAttribute("value"), await opcao.innerText()];
  const titulo = texto.split(" · ")[0];
  await seletor.selectOption(valor!);
  await page.locator('input[name="nome"]').fill("Pessoa Fictícia");
  await page.locator('input[name="setor"]').fill("Setor Fictício");
  await page.getByRole("button", { name: "Registrar empréstimo", exact: true }).click();
  await expect(page.getByText("Empréstimo registrado.")).toBeVisible({ timeout: 30_000 });

  const linha = page.getByRole("row").filter({ hasText: titulo });
  await expect(linha.first()).toBeVisible();

  // Pesquisa: o documento aparece como emprestado.
  await page.goto(`/pesquisa?q=${encodeURIComponent(titulo.split(" ").pop()!)}`);
  await expect(page.getByText("Emprestado").first()).toBeVisible();

  // Devolução: some de "Em aberto".
  await page.goto("/emprestimos");
  await page.getByRole("row").filter({ hasText: titulo }).first().getByRole("button", { name: "Devolver" }).click();
  await expect(page.getByRole("row").filter({ hasText: titulo })).toHaveCount(0, { timeout: 30_000 });
});
