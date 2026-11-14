import { expect, test, type Page } from "@playwright/test";
import { USUARIOS, temSupabase } from "./dados";
import { cadastrarAutenticador, entrar, semFalhasDeAcessibilidade } from "./ajuda";

// Critério 7 de docs/fases/fase-2.md. Usa a estrutura do supabase/seed.sql
// (Galpão Central: Rua A com 2 módulos × 3 níveis × 4 posições e 2 caixas
// por nível; Rua B com 1 módulo × 2 níveis vazios). Precisa do Supabase local.
test.skip(!temSupabase && !process.env.CI, "sem Supabase local");
test.describe.configure({ mode: "serial", retries: 0 });

const linhaDaRua = (page: Page, codigo: string) => page.getByRole("row", { name: new RegExp(`^Rua ${codigo}\\b`) });

async function abrirEstrutura(page: Page) {
  await page.getByRole("link", { name: "Estrutura física", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Estrutura física" })).toBeVisible();
}

test("perfil Consulta vê a estrutura e a ocupação só para leitura", async ({ page }) => {
  await entrar(page, { email: USUARIOS.consultaEstrutura.email, secretaria: "Saúde" });
  await expect(page).toHaveURL(/\/inicio$/);
  await abrirEstrutura(page);
  await semFalhasDeAcessibilidade(page);
  await expect(linhaDaRua(page, "A")).toContainText("50%");
  await expect(page.getByRole("button", { name: "Nova rua" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Adicionar módulos" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Últimas alterações" })).toHaveCount(0);

  await page.getByRole("link", { name: "Ver Rua A" }).click();
  await page.getByRole("link", { name: "Ver Módulo 1 · Nível 1" }).click();
  await expect(page.getByText("A-M1-N1-C02")).toBeVisible();
  await expect(page.getByRole("button", { name: "Cadastrar caixas" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Desativar rua" })).toHaveCount(0);
  await semFalhasDeAcessibilidade(page);
});

test("coordenador cadastra caixas, mas não mexe na estrutura", async ({ page }) => {
  await entrar(page, { email: USUARIOS.coordEstrutura.email, secretaria: "Obras" });
  await expect(page).toHaveURL(/\/inicio$/);
  await abrirEstrutura(page);
  await expect(page.getByRole("button", { name: "Nova rua" })).toHaveCount(0);
  await page.getByRole("link", { name: "Editar Rua B" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Rua B" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Desativar rua" })).toHaveCount(0);
  await page.getByRole("link", { name: "Gerenciar Módulo 1 · Nível 1" }).click();
  await expect(page.getByRole("button", { name: "Salvar capacidade" })).toHaveCount(0);
  await page.getByLabel("Quantidade de caixas").selectOption("2");
  await page.getByRole("button", { name: "Cadastrar caixas" }).click();
  await expect(page.getByRole("status").filter({ hasText: "2 caixas cadastradas." })).toBeVisible();
  await expect(page.getByRole("row", { name: /^Nível 1\s*B-M1-N1/ })).toContainText("2 de 4");
  await semFalhasDeAcessibilidade(page);
});

test("administrador cria rua, gera módulos e níveis pelas listas e a ocupação acompanha as caixas", async ({ page }) => {
  test.setTimeout(120_000);
  await entrar(page, { email: USUARIOS.adminEstrutura.email, secretaria: "Todas as secretarias" });
  await cadastrarAutenticador(page);
  await expect(page).toHaveURL(/\/inicio$/);
  await abrirEstrutura(page);
  await semFalhasDeAcessibilidade(page);

  await page.getByRole("button", { name: "Nova rua" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Rua C cadastrada." })).toBeVisible();
  await expect(linhaDaRua(page, "C")).toContainText("0%");

  await page.getByLabel("Rua", { exact: true }).selectOption({ label: "C" });
  await page.getByLabel("Módulos", { exact: true }).selectOption("2");
  await page.getByLabel("Níveis por módulo").selectOption("3");
  await page.getByLabel("Caixas por nível").selectOption("4");
  await page.getByRole("button", { name: "Adicionar ao galpão" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Módulos 1 a 2 adicionados." })).toBeVisible();
  await expect(linhaDaRua(page, "C")).toHaveText(/Rua C\s*2\s*6\s*0\s*0%/);

  await page.getByRole("link", { name: "Editar Rua C" }).click();
  await page.getByRole("link", { name: "Gerenciar Módulo 1 · Nível 1" }).click();
  await page.getByLabel("Quantidade de caixas").selectOption("4");
  await page.getByRole("button", { name: "Cadastrar caixas" }).click();
  // Nível cheio: o formulário sai e a tela diz que não há posição livre.
  await expect(page.getByText("Nível cheio: não há posição livre.")).toBeVisible();
  await expect(page.getByRole("row", { name: /^Nível 1\s*C-M1-N1/ })).toContainText("4 de 4");
  await expect(page.getByRole("button", { name: "Cadastrar caixas" })).toHaveCount(0);
  await page.getByRole("button", { name: "Desativar nível" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Ainda há caixas ativas aqui. Desative as caixas antes." })).toBeVisible();
  await semFalhasDeAcessibilidade(page);

  await page.getByRole("link", { name: "Voltar para a estrutura" }).click();
  await expect(linhaDaRua(page, "C")).toContainText("17%");
  await expect(page.getByText("4 caixas adicionadas")).toBeVisible();
});
