import { test } from "@playwright/test";

// Lado a lado: quadro do canvas (arquivo local, com o runtime ao lado) e a tela
// do sistema na demonstração. Uso: PARES="Inicio:/inicio:940" npx playwright test ... canvas
const PASTA = "C:/Users/karoe_j3g79yv/AppData/Local/Temp/claude/5654eada85a36473/e185c398-5ad7-4461-873a-deacf7cadbfd/scratchpad/artifact-files/164f0f71-e6d5-4131-8d98-363dddfb1f6c/project";
const pares = (process.env.PARES ?? "Inicio:/inicio:940").split(",").map((p) => p.split(":"));

test.beforeEach(async ({ context }) => {
  await context.addCookies([
    { name: "liccont_demo_perfil", value: process.env.PERFIL ?? "administrador", url: "http://localhost:3200" },
    { name: "liccont_secretaria", value: "de100000-0000-0000-0000-000000000004", url: "http://localhost:3200" },
  ]);
});

for (const tema of ["Claro", "Escuro"]) {
  test(`comparar ${tema}`, async ({ page }) => {
    test.setTimeout(240_000);
    for (const [quadro, url, altura] of pares) {
      const h = Number(altura);
      await page.setViewportSize({ width: 1280, height: h });
      await page.goto(`file:///${PASTA}/${quadro}${tema}.dc.html`);
      await page.waitForTimeout(2500);
      await page.screenshot({ path: `test-results/cmp/${quadro}-${tema}-canvas.png` });
      await page.emulateMedia({ colorScheme: tema === "Claro" ? "light" : "dark" });
      await page.setViewportSize({ width: 1280, height: h + 46 });
      await page.goto(url);
      await page.waitForTimeout(2500);
      await page.screenshot({ path: `test-results/cmp/${quadro}-${tema}-app.png` });
    }
  });
}
