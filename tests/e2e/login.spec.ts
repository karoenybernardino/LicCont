import { expect, test } from "@playwright/test";
import { PREFEITURA, SENHA, USUARIOS, temSupabase } from "./dados";
import {
  ERRO,
  cadastrarAutenticador,
  codigoNovo,
  conferirMolduraFixa,
  entrar,
  secretariaEmUso,
  semFalhasDeAcessibilidade,
} from "./ajuda";

// Critério 5 de docs/fases/fase-1.md. Precisa do Supabase local (job do CI).
test.skip(!temSupabase && !process.env.CI, "sem Supabase local");
// Repetir um teste somaria falhas e bloquearia a conta de teste (limite de 5).
test.describe.configure({ retries: 0 });

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
  await expect(secretariaEmUso(page)).toHaveText("Saúde");
  await page.locator("#secretaria-em-uso").click();
  const opcoes = await page.getByRole("option").allTextContents();
  expect(opcoes.sort((a, b) => a.localeCompare(b, "pt-BR"))).toEqual(["Educação", "Saúde"]);
  await page.getByRole("option", { name: "Educação" }).click();
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
  await expect(page.getByTestId("erro-formulario")).toHaveText("A senha precisa ter pelo menos 8 caracteres.");

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
  await expect(page.getByRole("heading", { level: 1, name: "Início" })).toBeVisible();
  await conferirMolduraFixa(page);
});
