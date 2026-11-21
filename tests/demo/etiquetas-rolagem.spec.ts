import { expect, test } from "@playwright/test";

// Regressão: a página de Etiquetas aparecia cortada no desktop (o topo sumia e não dava para voltar).
// Causa: caixas de marcar `sr-only` (position:absolute) sem ancestral `relative`, dentro de um layout
// com `body{overflow:hidden}`; o foco rolava o documento. Estes testes clicam nas caixas e conferem o topo.
const TELAS = [
  { width: 1280, height: 720 },
  { width: 1366, height: 768 },
  { width: 1920, height: 1080 },
];

test.beforeEach(async ({ context }) => {
  await context.addCookies([
    { name: "liccont_demo_perfil", value: "administrador", url: "http://localhost:3200" },
    { name: "liccont_secretaria", value: "de100000-0000-0000-0000-000000000004", url: "http://localhost:3200" },
  ]);
});

for (const tela of TELAS) {
  for (const tema of ["light", "dark"] as const) {
    for (const cenario of ["poucas", "muitas"] as const) {
      test(`etiquetas ${tela.width}x${tela.height} ${tema} com ${cenario} marcadas: topo visível e rolagem normal`, async ({ page }) => {
        await page.setViewportSize(tela);
        await page.emulateMedia({ colorScheme: tema });
        await page.goto("/etiquetas");
        const titulo = page.getByRole("heading", { level: 1, name: "Etiquetas" });
        await expect(titulo).toBeVisible();

        if (cenario === "muitas") await page.getByLabel("Marcar todas as que aparecem").check({ force: true });
        else await page.getByRole("checkbox").nth(4).check({ force: true });
        // marca a última linha da lista: é o clique que fazia o navegador rolar o documento
        const marcas = page.getByRole("checkbox");
        await marcas.last().focus();
        await page.keyboard.press("Space");

        const r = await page.evaluate(() => ({
          topoDoc: document.documentElement.scrollTop + document.body.scrollTop,
          paginaMaior: document.documentElement.scrollHeight > innerHeight + 1,
          soltos: [...document.querySelectorAll("main .sr-only")].filter((e) => (e as HTMLElement).offsetParent === document.body).map((e) => e.outerHTML.slice(0, 140)),
        }));
        expect(r.topoDoc).toBe(0);
        expect(r.paginaMaior).toBe(false);
        expect(r.soltos).toEqual([]);
        await expect(titulo).toBeInViewport();

        // a área de conteúdo rola até o fim e mostra o botão de imprimir
        await page.locator("main").evaluate((m) => m.scrollTo(0, m.scrollHeight));
        await expect(page.getByRole("button", { name: /^Imprimir/ })).toBeInViewport();
      });
    }
  }
}
