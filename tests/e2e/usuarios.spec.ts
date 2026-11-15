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
  await page.getByRole("button", { name: "Configurações" }).click();
  await page.locator("aside").getByRole("link", { name: "Secretarias", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Secretarias" })).toBeVisible();
  await semFalhasDeAcessibilidade(page);
  await page.getByRole("link", { name: "+ Nova secretaria" }).click();
  await semFalhasDeAcessibilidade(page);
  await page.getByLabel("Nome da secretaria").fill("Obras");
  await page.getByRole("button", { name: "Salvar e cadastrar outra" }).click();
  await expect(page.getByRole("status")).toContainText("Secretaria cadastrada");
  await page.getByLabel("Nome da secretaria").fill("Cultura");
  await page.getByRole("button", { name: "Salvar secretaria", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Secretarias" })).toBeVisible();
  await page.getByRole("link", { name: "Editar Cultura" }).click();
  await page.getByLabel("Situação").selectOption({ label: "Desativada" });
  await page.getByRole("button", { name: "Salvar secretaria", exact: true }).click();
  await expect(page.getByRole("row", { name: /Cultura/ })).toContainText("Desativada");

  // Usuários: cadastrar operador só em Obras.
  await page.getByRole("button", { name: "Configurações" }).click();
  await page.locator("aside").getByRole("link", { name: "Usuários e perfis", exact: true }).click();
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
  // Primeiro acesso: aceite da política e do termo antes de usar o sistema.
  await expect(page).toHaveURL(/\/aceite$/);
  await page.getByRole("button", { name: "Aceitar e continuar" }).click();
  await expect(page.getByTestId("erro-formulario")).toHaveText("Marque a caixa para continuar.");
  await page.getByLabel("Li e aceito").check();
  await page.getByRole("button", { name: "Aceitar e continuar" }).click();
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

  await page.goto("/equipe/prefeituras");
  await page.getByRole("link", { name: "+ Nova prefeitura" }).click();
  await semFalhasDeAcessibilidade(page);
  await page.getByLabel("Nome do órgão").fill("Prefeitura Fictícia Nova");
  await page.getByLabel("CNPJ").fill("00.000.000/0005-55");
  // Cada passo só vale depois da hidratação: repete o clique até o passo mudar.
  for (const passo of ["Contrato e TCE-CE", "Administrador", "Conferir"]) {
    await expect(async () => {
      await page.getByRole("button", { name: "Continuar" }).click({ timeout: 2000 });
      await expect(page.locator('li[aria-current="step"]')).toContainText(passo, { timeout: 1000 });
    }).toPass({ timeout: 15_000 });
  }
  await page.getByRole("button", { name: "Salvar e criar base" }).click();
  await expect(page.getByRole("heading", { name: "Prefeitura Fictícia Nova" })).toBeVisible();

  await page.getByLabel("Situação", { exact: true }).selectOption({ label: "Ativa" });
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Situação atualizada.");

  await page.getByRole("link", { name: "Administradores" }).click();
  const posts: string[] = [];
  page.on("response", (r) => r.request().method() === "POST" && posts.push(`${r.status()} ${new URL(r.url()).pathname}`));
  await page.getByLabel("Nome", { exact: true }).fill("Admin Fictício Novo");
  await page.getByLabel("E-mail institucional").fill("admin.novo@exemplo.test");
  await page.getByRole("button", { name: "Cadastrar administrador" }).click();
  await expect(page.getByTestId("senha-provisoria"))
    .toHaveText(/^.{16}$/, { timeout: 20_000 })
    .catch(async (e) => {
      throw new Error(`${JSON.stringify(await page.locator('[role="alert"], [role="status"], button[type="submit"]').allInnerTexts())} :: ${posts.join(" | ")} :: ${e.message.slice(0, 40)}`);
    });

  // Prefeitura com usuário não aceita outro "primeiro administrador".
  await page.reload();
  await expect(page.getByRole("cell", { name: "admin.novo@exemplo.test" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Cadastrar administrador" })).toHaveCount(0);
});
