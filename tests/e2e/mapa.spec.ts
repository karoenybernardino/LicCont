import { expect, test } from "@playwright/test";
import { USUARIOS, temSupabase } from "./dados";
import { entrar, semFalhasDeAcessibilidade } from "./ajuda";

// Critério 11 de docs/fases/fase-4.md (parte que roda com a estrutura do
// supabase/seed.sql: Galpão Central, Rua A com 2 módulos x 3 níveis x 2 caixas
// e Rua B com 1 módulo). Precisa do Supabase local. O Chromium do CI roda o
// WebGL por software; sem ele o mapa abre na planta e os passos do 3D são
// pulados.
test.skip(!temSupabase && !process.env.CI, "sem Supabase local");
test.describe.configure({ mode: "serial", retries: 0 });

test("o operador escolhe uma caixa pela lista, vê o painel e troca de vista sem perder a seleção", async ({ page }) => {
  await entrar(page, { email: USUARIOS.operadorDocs.email, secretaria: "Saúde" });
  await expect(page).toHaveURL(/\/inicio$/);
  await page.getByRole("link", { name: "Mapa 3D", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Mapa 3D" })).toBeVisible();
  await semFalhasDeAcessibilidade(page);

  await page.getByRole("button", { name: "Ver em lista" }).click();
  await page.getByText("Rua A", { exact: true }).click();
  await page.getByText("Módulo 1", { exact: true }).click();
  await page.getByRole("button", { name: "Caixa A-M1-N1-C01" }).click();
  await expect(page.getByRole("region", { name: "Caixa selecionada" })).toContainText("A-M1-N1-C01");
  await expect(page.getByRole("region", { name: "Dentro da caixa" })).toBeVisible();
  await expect(page).toHaveURL(/caixa=/);

  for (const vista of ["Planta", "Corredor", "Perspectiva"]) {
    await page.getByRole("button", { name: vista, exact: true }).click();
    await expect(page.getByRole("region", { name: "Caixa selecionada" })).toContainText("A-M1-N1-C01");
  }

  await page.getByRole("button", { name: "Mostrar ocupação" }).click();
  await expect(page.getByRole("list", { name: "Legenda" })).toContainText("Abaixo de 50%");
  await page.getByRole("button", { name: "Planta", exact: true }).click();
  await semFalhasDeAcessibilidade(page);
});

test("a busca do mapa aceita o código da caixa e mostra erro para código que não existe", async ({ page }) => {
  await entrar(page, { email: USUARIOS.operadorDocs.email, secretaria: "Saúde" });
  await expect(page).toHaveURL(/\/inicio$/);
  await page.goto("/mapa?vista=planta");
  const busca = page.getByLabel("Ir para caixa, rua ou documento");
  await busca.fill("a m1 n1 c2");
  await page.getByRole("button", { name: "Ir", exact: true }).click();
  await expect(page.getByRole("region", { name: "Caixa selecionada" })).toContainText("A-M1-N1-C02");
  await expect(page.getByRole("region", { name: "Dentro da caixa" })).toBeVisible();
  await busca.fill("Z-M9-N9-C09");
  await page.getByRole("button", { name: "Ir", exact: true }).click();
  await expect(page.getByText("Caixa não encontrada.").first()).toBeVisible();
});

test("isolamento: caixa de outra prefeitura e caixa que não existe dão a mesma resposta", async ({ page }) => {
  await entrar(page, { email: USUARIOS.outra.email, secretaria: "Saúde", prefeitura: USUARIOS.outra.prefeitura });
  await expect(page).toHaveURL(/\/inicio$/);
  await page.goto("/mapa?caixa=5eed4000-0000-0000-0000-000000000001");
  await expect(page.getByText("Caixa não encontrada.").first()).toBeVisible();
  await page.goto("/mapa?caixa=ffffffff-ffff-ffff-ffff-ffffffffffff");
  await expect(page.getByText("Caixa não encontrada.").first()).toBeVisible();
});

test("o editor da planta abre para o coordenador e não para o operador", async ({ page }) => {
  await entrar(page, { email: USUARIOS.coordEstrutura.email, secretaria: "Obras" });
  await expect(page).toHaveURL(/\/inicio$/);
  await page.goto("/mapa/editar");
  await expect(page.getByRole("heading", { level: 1, name: "Editar planta" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Salvar planta" })).toBeDisabled();
  await semFalhasDeAcessibilidade(page);
});

test("operador não abre o editor da planta", async ({ page }) => {
  await entrar(page, { email: USUARIOS.operadorDocs.email, secretaria: "Saúde" });
  await expect(page).toHaveURL(/\/inicio$/);
  await page.goto("/mapa/editar");
  await expect(page).toHaveURL(/\/mapa$/);
});

test("consulta não vê as caixas de marcar documentos", async ({ page }) => {
  await entrar(page, { email: USUARIOS.consultaDocs.email, secretaria: "Saúde" });
  await expect(page).toHaveURL(/\/inicio$/);
  await page.goto("/mapa?vista=planta");
  await expect(page.getByRole("heading", { level: 1, name: "Mapa 3D" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Marcar todos" })).toHaveCount(0);
});
