import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { PREFEITURA, SENHA, USUARIOS, temSupabase } from "./dados";
import { codigoTotp } from "./totp";

// Critério 5 de docs/fases/fase-1.md. Precisa do Supabase local (job do CI).
test.skip(!temSupabase && !process.env.CI, "sem Supabase local");
// Repetir um teste somaria falhas e bloquearia a conta de teste (limite de 5).
test.describe.configure({ retries: 0 });

const ERRO = "Não foi possível entrar. Confira os dados ou fale com o administrador da sua prefeitura.";

async function semFalhasDeAcessibilidade(page: Page) {
  const { violations } = await new AxeBuilder({ page }).analyze();
  expect(violations).toEqual([]);
}

const secretariaEmUso = (page: Page) => page.getByLabel("Secretaria").locator("option:checked");

// Cadastra o autenticador na primeira vez e devolve o segredo TOTP.
async function cadastrarAutenticador(page: Page) {
  await expect(page).toHaveURL(/\/segundo-fator$/);
  await semFalhasDeAcessibilidade(page);
  await page.getByRole("button", { name: "Mostrar QR code" }).click();
  const segredo = (await page.getByTestId("segredo-totp").textContent())!.trim();
  await expect(page.getByRole("img", { name: /QR code/ })).toBeVisible();
  await page.getByLabel("Código do aplicativo").fill(codigoTotp(segredo));
  await page.getByRole("button", { name: "Confirmar" }).click();
  return segredo;
}

// Espera a próxima janela de 30 s: um código não vale duas vezes.
async function codigoNovo(segredo: string, page: Page) {
  await page.waitForTimeout(30_000 - (Date.now() % 30_000) + 1_000);
  return codigoTotp(segredo);
}

async function entrar(
  page: Page,
  { email, senha = SENHA, secretaria = "Saúde", prefeitura = PREFEITURA }: {
    email: string;
    senha?: string;
    secretaria?: string;
    prefeitura?: string;
  },
) {
  await page.goto("/entrar");
  await page.getByLabel("Prefeitura").selectOption({ label: prefeitura });
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByRole("heading", { name: "Entrar" })).toBeVisible();
  await page.getByLabel("Secretaria").selectOption({ label: secretaria });
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(senha);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
}

test("login em duas etapas leva ao sistema na secretaria escolhida", async ({ page }) => {
  await page.goto("/entrar");
  await semFalhasDeAcessibilidade(page);
  await page.getByLabel("Prefeitura").selectOption({ label: PREFEITURA });
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page).toHaveURL(/\/entrar\/dados$/);
  await expect(page.getByRole("heading", { name: "Entrar", exact: true })).toBeVisible();
  await semFalhasDeAcessibilidade(page);

  await entrar(page, { email: USUARIOS.operador.email });
  await expect(page).toHaveURL(/\/inicio$/);
  await expect(secretariaEmUso(page)).toHaveText("Saúde");
  await semFalhasDeAcessibilidade(page);
});

test("mesma mensagem para e-mail inexistente, senha errada, secretaria sem vínculo e 'Todas' sem ser administrador", async ({
  page,
}) => {
  const casos = [
    { email: "ninguem@exemplo.test" },
    { email: USUARIOS.falhas.email, senha: "senha-errada-123" },
    { email: USUARIOS.falhas.email, secretaria: "Obras" },
    { email: USUARIOS.falhas.email, secretaria: "Todas as secretarias" },
    { email: USUARIOS.outra.email },
  ];
  for (const caso of casos) {
    await entrar(page, caso);
    await expect(page.getByTestId("erro-formulario")).toHaveText(ERRO);
    await expect(page).toHaveURL(/\/entrar\/dados$/);
  }
});

test("administrador cadastra o autenticador, precisa do código a cada login e entra em 'Todas as secretarias'", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await entrar(page, { email: USUARIOS.admin.email, secretaria: "Todas as secretarias" });
  await expect(page).toHaveURL(/\/segundo-fator$/);
  // Sem o segundo fator não abre o sistema.
  await page.goto("/inicio");
  await expect(page).toHaveURL(/\/segundo-fator$/);

  const segredo = await cadastrarAutenticador(page);
  await expect(page).toHaveURL(/\/inicio$/);
  await expect(secretariaEmUso(page)).toHaveText("Todas as secretarias");

  await page.getByRole("button", { name: "Sair" }).click();
  await entrar(page, { email: USUARIOS.admin.email, secretaria: "Saúde" });
  await expect(page).toHaveURL(/\/segundo-fator$/);
  await expect(page.getByRole("heading", { name: "Código de acesso" })).toBeVisible();
  await page.getByLabel("Código do aplicativo").fill("000000");
  await page.getByRole("button", { name: "Confirmar" }).click();
  await expect(page.getByTestId("erro-formulario")).toContainText("Código inválido");
  await page.getByLabel("Código do aplicativo").fill(await codigoNovo(segredo, page));
  await page.getByRole("button", { name: "Confirmar" }).click();
  await expect(page).toHaveURL(/\/inicio$/);
  await expect(secretariaEmUso(page)).toHaveText("Saúde");
});

test("troca de secretaria dentro do sistema, só entre as vinculadas", async ({ page }) => {
  await entrar(page, { email: USUARIOS.duas.email, secretaria: "Saúde" });
  await expect(page).toHaveURL(/\/inicio$/);
  const opcoes = await page.getByLabel("Secretaria").locator("option").allTextContents();
  expect(opcoes.sort()).toEqual(["Educação", "Saúde"]);
  await page.getByLabel("Secretaria").selectOption({ label: "Educação" });
  await page.getByRole("button", { name: "Trocar", exact: true }).click();
  await expect(secretariaEmUso(page)).toHaveText("Educação");
});

test("bloqueia a conta depois de 5 falhas, mesmo com a senha certa", async ({ page }) => {
  for (let i = 0; i < 5; i++) {
    await entrar(page, { email: USUARIOS.bloqueio.email, senha: `errada-${i}-xxxxxx` });
    await expect(page.getByTestId("erro-formulario")).toHaveText(ERRO);
  }
  await entrar(page, { email: USUARIOS.bloqueio.email });
  await expect(page.getByTestId("erro-formulario")).toHaveText(ERRO);
  await expect(page).toHaveURL(/\/entrar\/dados$/);
});

test("senha provisória obriga a criar uma nova antes de usar o sistema", async ({ page }) => {
  await entrar(page, { email: USUARIOS.novo.email, secretaria: "Educação" });
  await expect(page).toHaveURL(/\/nova-senha$/);
  await semFalhasDeAcessibilidade(page);

  await page.goto("/inicio");
  await expect(page).toHaveURL(/\/nova-senha$/);

  await page.getByLabel("Nova senha", { exact: true }).fill("curta");
  await page.getByLabel("Repita a nova senha").fill("curta");
  await page.getByRole("button", { name: "Salvar senha" }).click();
  await expect(page.getByTestId("erro-formulario")).toHaveText("A senha precisa ter pelo menos 12 caracteres.");

  const nova = `Nova-${crypto.randomUUID()}`;
  await page.getByLabel("Nova senha", { exact: true }).fill(nova);
  await page.getByLabel("Repita a nova senha").fill(nova);
  await page.getByRole("button", { name: "Salvar senha" }).click();
  await expect(page).toHaveURL(/\/inicio$/);
});

test("sai sozinho depois de 30 minutos sem uso", async ({ page, context, baseURL }) => {
  await entrar(page, { email: USUARIOS.inatividade.email, secretaria: "Obras" });
  await expect(page).toHaveURL(/\/inicio$/);

  await context.addCookies([
    {
      name: "liccont_atividade",
      value: String(Date.now() - 31 * 60 * 1000),
      url: baseURL!,
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
    },
  ]);
  await page.goto("/inicio");
  await expect(page).toHaveURL(/\/entrar\?motivo=inatividade$/);
  await expect(page.getByRole("status")).toContainText("30 minutos sem uso");

  await page.goto("/inicio");
  await expect(page).toHaveURL(/\/entrar$/);
});

test("Sair encerra a sessão", async ({ page, context }) => {
  await entrar(page, { email: USUARIOS.operador.email });
  await expect(page).toHaveURL(/\/inicio$/);

  const cookies = await context.cookies();
  for (const c of cookies.filter((c) => c.name.startsWith("sb-") || c.name.startsWith("liccont_"))) {
    expect(c.httpOnly, c.name).toBe(true);
    expect(c.sameSite, c.name).toBe("Lax");
  }

  await page.getByRole("button", { name: "Sair" }).click();
  await expect(page).toHaveURL(/\/entrar$/);
  await page.goto("/inicio");
  await expect(page).toHaveURL(/\/entrar$/);
});

test("equipe LicCONT entra pelo endereço próprio; usuário de prefeitura não", async ({ page }) => {
  await page.goto("/equipe/entrar");
  await semFalhasDeAcessibilidade(page);

  await page.getByLabel("E-mail").fill(USUARIOS.falhas.email);
  await page.getByLabel("Senha", { exact: true }).fill(SENHA);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByTestId("erro-formulario")).toHaveText(ERRO);

  await page.getByLabel("E-mail").fill(USUARIOS.equipe.email);
  await page.getByLabel("Senha", { exact: true }).fill(SENHA);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/segundo-fator$/);
  await page.goto("/equipe");
  await expect(page).toHaveURL(/\/segundo-fator$/);
  await cadastrarAutenticador(page);
  await expect(page).toHaveURL(/\/equipe$/);
  await expect(page.getByRole("heading", { name: "Equipe LicCONT" })).toBeVisible();
});
