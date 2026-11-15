import { expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { PREFEITURA, SENHA } from "./dados";
import { codigoTotp } from "./totp";

// Passos comuns dos testes de ponta a ponta.

// Espera a tela "Carregando…" sair (a página chega aos poucos).
export async function esperarCarregar(page: Page) {
  await expect(page.locator("main[aria-busy=true]")).toHaveCount(0);
  await expect(page.locator("h1")).toBeVisible();
  // O título chega em streaming, depois do corpo.
  await expect(page).toHaveTitle(/.+/);
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

// Moldura fixa: com conteúdo comprido, menu e cabeçalho não se mexem e só o miolo rola
// (no computador); no celular a página não rola para o lado.
export async function conferirMolduraFixa(page: Page) {
  await esperarCarregar(page);
  await page.waitForLoadState("networkidle"); // o React termina de montar a tela antes de medirmos
  const original = page.viewportSize()!;
  const caixa = (seletor: string) => page.locator(seletor).first().boundingBox();
  const miolo = page.locator("[data-moldura] main");
  // Põe um bloco alto no miolo (de novo, se a tela o refizer) e rola até o fim.
  const rolar = () =>
    miolo.evaluate((m) => {
      if (!m.querySelector("[data-teste=alto]")) {
        const bloco = document.createElement("div");
        bloco.dataset.teste = "alto";
        bloco.style.cssText = "height:3000px;flex:none";
        m.append(bloco);
      }
      m.scrollTo({ top: m.scrollHeight, behavior: "instant" });
      return m.scrollTop;
    });
  for (const [largura, altura] of [[1280, 720], [375, 812]] as const) {
    await page.setViewportSize({ width: largura, height: altura });
    if (largura >= 768) {
      const antes = [await caixa("[data-moldura] > aside"), await caixa("[data-moldura] header")];
      await expect.poll(rolar).toBeGreaterThan(0);
      expect(await page.evaluate(() => window.scrollY)).toBe(0);
      expect([await caixa("[data-moldura] > aside"), await caixa("[data-moldura] header")]).toEqual(antes);
    }
    // Se estourar, a mensagem lista quem passa da borda (fora do menu, que rola por dentro).
    const estouram = await page.evaluate(() =>
      document.documentElement.scrollWidth <= window.innerWidth
        ? []
        : [...document.querySelectorAll("body *:not(aside *)")]
            .filter((e) => !e.closest(".overflow-x-auto") && e.getBoundingClientRect().right > window.innerWidth + 1)
            .slice(0, 5)
            .map((e) => `${e.tagName}.${String(e.getAttribute("class")).slice(0, 50)}`),
    );
    expect(estouram).toEqual([]);
    await page.evaluate(() => document.querySelector("[data-teste=alto]")?.remove());
  }
  await page.setViewportSize(original);
}
