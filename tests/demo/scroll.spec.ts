import { expect, test } from "@playwright/test";

test.beforeEach(async ({ context }) => {
  await context.addCookies([
    { name: "liccont_demo_perfil", value: "administrador", url: "http://localhost:3200" },
    { name: "liccont_secretaria", value: "de100000-0000-0000-0000-000000000004", url: "http://localhost:3200" },
  ]);
});

test("pesquisa: a página não rola; o detalhe não tem rolagem própria", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/pesquisa");
  await page.getByRole("region", { name: "Resultados" }).getByRole("link").first().click();
  await page.waitForLoadState("networkidle");
  const r = await page.evaluate(() => ({
    pagina: document.documentElement.scrollHeight > innerHeight + 1 || document.body.scrollHeight > innerHeight + 1,
    rolaveis: [...document.querySelectorAll("body *")]
      .filter((e) => {
        const o = getComputedStyle(e).overflowY;
        return (o === "auto" || o === "scroll") && e.scrollHeight > e.clientHeight + 1;
      })
      .map((e) => e.tagName.toLowerCase() + (e.closest("section") ? "@lista" : "")),
  }));
  expect(r.pagina).toBe(false);
  // só a lista de resultados (dentro da seção) e a área de conteúdo rolam; o detalhe não
  expect(r.rolaveis.filter((x) => !x.includes("@lista") && !x.startsWith("main") && !x.startsWith("aside"))).toEqual([]);
});

test("início: rola só a área de conteúdo", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 500 });
  await page.goto("/inicio");
  const r = await page.evaluate(() => document.documentElement.scrollHeight > innerHeight + 1);
  expect(r).toBe(false);
});
