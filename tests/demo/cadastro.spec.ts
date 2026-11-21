import { expect, test } from "@playwright/test";

test.beforeEach(async ({ context }) => {
  await context.addCookies([
    { name: "liccont_demo_perfil", value: "administrador", url: "http://localhost:3200" },
    { name: "liccont_secretaria", value: "de100000-0000-0000-0000-000000000004", url: "http://localhost:3200" },
  ]);
});

test("cadastro de documento: sem empresa, valor, situação, CNPJ, data e encerramento; órgão é um botão Câmara | Prefeitura", async ({ page }) => {
  await page.goto("/documentos/novo");
  await expect(page.getByRole("heading", { level: 1, name: "Cadastrar documento" })).toBeVisible();
  const form = page.locator("form");
  for (const removido of [/empresa/i, /valor/i, /situa[cç][aã]o/i, /cnpj|cpf/i, /data do documento/i, /encerramento/i]) {
    await expect(form.getByText(removido)).toHaveCount(0);
    await expect(form.getByLabel(removido)).toHaveCount(0);
  }
  const orgao = form.getByRole("radiogroup", { name: "Órgão" });
  await expect(orgao.getByRole("radio", { name: "Prefeitura" })).toHaveAttribute("aria-checked", "true");
  await orgao.getByRole("radio", { name: "Câmara" }).click();
  await expect(orgao.getByRole("radio", { name: "Câmara" })).toHaveAttribute("aria-checked", "true");
  await expect(orgao.getByRole("radio", { name: "Prefeitura" })).toHaveAttribute("aria-checked", "false");
  await expect(page.getByText("Conta a partir do fim do ano do documento")).toBeVisible();
  // A prévia é a etiqueta nova da caixa (a antiga era LICCONT + Rua/Módulo/Nível).
  await expect(page.getByText("PRAZO DE GUARDA").first()).toBeVisible();
  await expect(page.getByText("CX", { exact: true }).first()).toBeVisible();
});

test("cadastro de caixa geral: grade de meses e o código da classificação preenche classe e prazo", async ({ page }) => {
  await page.goto("/documentos/novo");
  await page.getByRole("link", { name: "Cadastro geral" }).click();
  await expect(page).toHaveURL(/modo=geral/);
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("radio", { name: "Licitações e contratos" })).toHaveCount(0);
  const meses = page.getByRole("group", { name: /^Meses/ }).getByRole("checkbox");
  await expect(meses).toHaveCount(12);
  await meses.nth(0).click();
  await meses.nth(5).click();
  await expect(meses.nth(0)).toHaveAttribute("aria-checked", "true");
  await expect(meses.nth(5)).toHaveAttribute("aria-checked", "true");
  await meses.nth(0).click();
  await expect(meses.nth(0)).toHaveAttribute("aria-checked", "false");

  await page.getByLabel("Código de classificação").fill("031");
  await page.getByLabel("Código de classificação").press("Enter");
  await expect(page.getByLabel("Classe (tabela de temporalidade)").locator("option:checked")).toContainText("031");
  await expect(page.getByLabel("Prazo de guarda (anos)")).toHaveValue("12");

  await page.getByLabel("Código de classificação").fill("999");
  await page.getByLabel("Código de classificação").press("Enter");
  await expect(page.getByText("Código não encontrado na tabela de temporalidade.")).toBeVisible();

});

test("cadastro de caixa: em demonstração salvar avisa que nada foi gravado", async ({ page }) => {
  await page.goto("/caixas/nova");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Código de classificação").fill("031");
  await page.getByLabel("Código de classificação").press("Enter");
  await expect(page.getByLabel("Prazo de guarda (anos)")).toHaveValue("12");
  await page.getByRole("button", { name: "Rua", exact: true }).click();
  await page.getByPlaceholder("Buscar rua…").press("Enter");
  await page.getByLabel("Módulo").selectOption({ index: 1 });
  await page.getByLabel("Nível").selectOption({ index: 1 });
  await expect(page.getByLabel("Caixa", { exact: true }).locator("option")).not.toHaveCount(1);
  await page.getByLabel("Caixa", { exact: true }).selectOption({ index: 1 });
  await page.getByRole("button", { name: "Salvar caixa" }).click();
  await expect(page.getByText("Modo demonstração: nada foi salvo.")).toBeVisible();
});

test("pesquisa: filtros de órgão, fundo, setor, mês e ano; aba de caixas gerais", async ({ page }) => {
  await page.goto("/pesquisa?aba=caixas");
  await expect(page.getByRole("list", { name: "Caixas gerais" }).getByRole("listitem")).toHaveCount(3);
  await page.goto("/pesquisa?aba=caixas&orgao=camara");
  await expect(page.getByRole("list", { name: "Caixas gerais" }).getByRole("listitem")).toHaveCount(1);
  await page.goto("/pesquisa?aba=caixas&mes=6&ano=2020&setor=tesouraria&fundo=educacao");
  await expect(page.getByRole("list", { name: "Caixas gerais" }).getByRole("listitem")).toHaveCount(1);
  for (const n of ["orgao", "fundo", "setor", "mes", "ano"]) await expect(page.locator(`[name="${n}"]`).first()).toBeVisible();
});
