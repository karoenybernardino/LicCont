import { expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { PREFEITURA, SENHA } from "./dados";
import { codigoTotp } from "./totp";

// Passos comuns dos testes de ponta a ponta.

// Espera a tela "Carregando…" sair (a página chega aos poucos).
export async function esperarCarregar(page: Page) {
  await expect(page.locator("main[aria-busy=true]")).toHaveCount(0);
  await expect(page.locator("h1")).toBeVisible();
}
export const ERRO = "Não foi possível entrar. Confira os dados ou fale com o administrador da sua prefeitura.";

export async function semFalhasDeAcessibilidade(page: Page) {
  await esperarCarregar(page);
  const { violations } = await new AxeBuilder({ page }).analyze();
  expect(violations).toEqual([]);
}

export const secretariaEmUso = (page: Page) => page.getByLabel("Secretaria", { exact: true }).locator("option:checked");

// Cadastra o autenticador na primeira vez e devolve o segredo TOTP.
export async function cadastrarAutenticador(page: Page) {
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
export async function codigoNovo(segredo: string, page: Page) {
  await page.waitForTimeout(30_000 - (Date.now() % 30_000) + 1_000);
  return codigoTotp(segredo);
}

export async function entrar(
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
  await page.getByLabel("Secretaria", { exact: true }).selectOption({ label: secretaria });
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(senha);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
}
