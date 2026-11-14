import { expect, test } from "@playwright/test";
import { OUTRA_PREFEITURA, USUARIOS, temSupabase } from "./dados";
import { ERRO, cadastrarAutenticador, entrar, secretariaEmUso, semFalhasDeAcessibilidade } from "./ajuda";

// Tarefa 6 de docs/fases/fase-1.md. Precisa do Supabase local (job do CI).
test.skip(!temSupabase && !process.env.CI, "sem Supabase local");
// Um só fluxo em série: o autenticador do administrador é cadastrado uma vez.
test.describe.configure({ mode: "serial", retries: 0 });

test("administrador cadastra, bloqueia, desbloqueia e redefine a senha de usuário que entra só na secretaria vinculada", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await entrar(page, { email: USUARIOS.admin2.email, prefeitura: OUTRA_PREFEITURA, secretaria: "Todas as secretarias" });
  await cadastrarAutenticador(page);
  await expect(page).toHaveURL(/\/inicio$/);

  // Secretarias: cadastrar e desativar.
  await page.getByRole("link", { name: "Secretarias", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Secretarias" })).toBeVisible();
  await semFalhasDeAcessibilidade(page);
  await page.getByLabel("Nome da secretaria").fill("Obras");
  await page.getByRole("button", { name: "Cadastrar" }).click();
  await expect(page.getByRole("status")).toHaveText("Secretaria cadastrada.");
  await page.getByLabel("Nome da secretaria").fill("Cultura");
  await page.getByRole("button", { name: "Cadastrar" }).click();
  await expect(page.getByRole("button", { name: "Desativar Cultura" })).toBeVisible();
  await page.getByRole("button", { name: "Desativar Cultura" }).click();
  await expect(page.getByRole("button", { name: "Reativar Cultura" })).toBeVisible();

  // Usuários: cadastrar operador só em Obras.
  await page.getByRole("link", { name: "Usuários e perfis", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Usuários e perfis" })).toBeVisible();
  await semFalhasDeAcessibilidade(page);
  await page.getByLabel("E-mail").fill("pessoa.nova@exemplo.test");
  await page.getByLabel("Nome").fill("Pessoa Nova Fictícia");
  await page.getByLabel("Perfil").selectOption({ label: "Operador" });
  await page.getByRole("checkbox", { name: "Obras" }).check();
  await expect(page.getByRole("checkbox", { name: "Cultura" })).toHaveCount(0);
  await page.getByRole("button", { name: "Cadastrar" }).click();
  expect((await page.getByTestId("senha-provisoria").textContent())!.trim()).toHaveLength(16);
  await page.reload();
  await expect(page.getByRole("cell", { name: "pessoa.nova@exemplo.test" })).toBeVisible();

  // Edição: bloquear, desbloquear e redefinir a senha.
  await page.getByRole("link", { name: "Editar Pessoa Nova Fictícia" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Pessoa Nova Fictícia" })).toBeVisible();
  await semFalhasDeAcessibilidade(page);
  await page.getByRole("button", { name: "Bloquear usuário" }).click();
  await expect(page.getByRole("button", { name: "Desbloquear usuário" })).toBeVisible();
  await page.getByRole("button", { name: "Desbloquear usuário" }).click();
  await expect(page.getByRole("button", { name: "Bloquear usuário" })).toBeVisible();
  await page.getByRole("button", { name: "Redefinir senha" }).click();
  const senha = (await page.getByTestId("senha-provisoria").textContent())!.trim();
  expect(senha).toHaveLength(16);
  await page.getByRole("button", { name: "Sair" }).click();

  // A pessoa nova não entra em Saúde (sem vínculo); entra em Obras e troca a senha.
  await entrar(page, { email: "pessoa.nova@exemplo.test", senha, prefeitura: OUTRA_PREFEITURA, secretaria: "Saúde" });
  await expect(page.getByTestId("erro-formulario")).toHaveText(ERRO);
  await entrar(page, { email: "pessoa.nova@exemplo.test", senha, prefeitura: OUTRA_PREFEITURA, secretaria: "Obras" });
  await expect(page).toHaveURL(/\/nova-senha$/);
  const nova = `Nova-${crypto.randomUUID()}`;
  await page.getByLabel("Nova senha", { exact: true }).fill(nova);
  await page.getByLabel("Repita a nova senha").fill(nova);
  await page.getByRole("button", { name: "Salvar senha" }).click();
  await expect(page).toHaveURL(/\/inicio$/);
  await expect(secretariaEmUso(page)).toHaveText("Obras");
  await expect(page.getByRole("link", { name: "Usuários e perfis", exact: true })).toHaveCount(0);
  await page.goto("/usuarios");
  await expect(page).toHaveURL(/\/inicio$/);
  await page.getByRole("button", { name: "Sair" }).click();
});

test("equipe cadastra prefeitura, ativa e cria o primeiro administrador", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/equipe/entrar");
  await page.getByLabel("E-mail").fill(USUARIOS.equipe2.email);
  await page.getByLabel("Senha", { exact: true }).fill("Senha-Ficticia-de-Teste-2026");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await cadastrarAutenticador(page);
  await expect(page).toHaveURL(/\/equipe$/);
  await semFalhasDeAcessibilidade(page);

  await page.getByLabel("Nome do órgão").fill("Prefeitura Fictícia Nova");
  await page.getByLabel("CNPJ").fill("00.000.000/0005-55");
  await page.getByRole("button", { name: "Cadastrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Prefeitura Fictícia Nova" })).toBeVisible();

  await page.getByLabel("Situação de Prefeitura Fictícia Nova").selectOption({ label: "Ativa" });
  const cartao = page.getByRole("listitem").filter({ has: page.getByRole("heading", { name: "Prefeitura Fictícia Nova" }) });
  await cartao.getByRole("button", { name: "Salvar situação" }).click();
  await expect(cartao.getByRole("status")).toHaveText("Situação atualizada.");

  await cartao.getByText("Primeiro administrador").click();
  await cartao.getByLabel("Nome do administrador").fill("Admin Fictício Novo");
  await cartao.getByLabel("E-mail do administrador").fill("admin.novo@exemplo.test");
  await cartao.getByRole("button", { name: "Cadastrar administrador" }).click();
  await expect(cartao.getByTestId("senha-provisoria")).toHaveText(/^.{16}$/);

  // Prefeitura com usuário não aceita outro "primeiro administrador".
  await cartao.getByLabel("Nome do administrador").fill("Outro Admin Fictício");
  await cartao.getByLabel("E-mail do administrador").fill("admin.outro@exemplo.test");
  await cartao.getByRole("button", { name: "Cadastrar administrador" }).click();
  await expect(cartao.getByTestId("erro-formulario")).toContainText("já tem usuários");
});
