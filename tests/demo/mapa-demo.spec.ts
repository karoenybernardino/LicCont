import { expect, test } from "@playwright/test";

test.beforeEach(async ({ context }) => {
  await context.addCookies([{ name: "liccont_demo_perfil", value: "coordenador", url: "http://localhost:3200" }, { name: "liccont_secretaria", value: "de100000-0000-0000-0000-000000000004", url: "http://localhost:3200" }]);
});

// Fluxos do mapa que o CI não cobre (precisam do navegador e do mouse). Na
// demonstração, salvar e mover devolvem o aviso e não gravam nada.

test("editor: arrastar uma rua muda a planta e salvar avisa que é demonstração", async ({ page }) => {
  await page.goto("/mapa/editar");
  await expect(page.getByRole("heading", { level: 1, name: "Editar planta" })).toBeVisible();
  const rua = page.locator('g[data-rua="A"] g rect').first();
  const caixa = (await rua.boundingBox())!;
  await page.mouse.move(caixa.x + 6, caixa.y + 6);
  await page.mouse.down();
  await page.mouse.move(caixa.x + 6 + 140, caixa.y + 6 + 70, { steps: 8 });
  await page.mouse.up();
  await expect(page.getByRole("status").filter({ hasText: "alteração não salva" })).toBeVisible();
  await page.getByRole("button", { name: "Desfazer" }).click();
  await expect(page.getByText("Nenhuma alteração")).toBeVisible();
  await page.getByRole("button", { name: "Refazer" }).click();
  await page.getByRole("button", { name: "Salvar planta" }).click();
  await expect(page.getByText("Modo demonstração: nada foi salvo.")).toBeVisible();
});

test("editor: as medidas saem em metros e acompanham os metros por célula", async ({ page }) => {
  await page.goto("/mapa/editar");
  await expect(page.getByLabel("Largura (m)")).toHaveValue("16.8");
  await expect(page.locator("svg text", { hasText: "16,8 m" })).toBeVisible();
  await page.getByLabel("Metros por célula").fill("2");
  await page.getByLabel("Metros por célula").press("Enter");
  await expect(page.getByLabel("Largura (m)")).toHaveValue("28");
  await expect(page.locator("svg text", { hasText: "28 m" })).toBeVisible();
  await page.getByLabel("Largura (m)").fill("20");
  await page.getByLabel("Largura (m)").press("Enter");
  await expect(page.locator("svg text", { hasText: "20 m" })).toBeVisible();
});

test("editor: acrescentar e remover um pilar", async ({ page }) => {
  await page.goto("/mapa/editar");
  await page.getByRole("button", { name: "Pilar" }).click();
  const svg = page.getByRole("group", { name: /^Planta de/ });
  const b = (await svg.boundingBox())!;
  await page.mouse.click(b.x + b.width * 0.8, b.y + b.height * 0.5);
  await expect(page.getByRole("button", { name: "Remover elemento" })).toBeVisible();
  await page.getByRole("button", { name: "Remover elemento" }).click();
  await expect(page.getByText("Elemento removido.")).toBeVisible();
});

test("mover em lote: marca documentos, escolhe a caixa de destino e confirma", async ({ page }) => {
  await page.goto("/mapa?vista=planta");
  await page.getByLabel("Ir para caixa, rua ou documento").fill("B-M3-N3-C02");
  await page.getByRole("button", { name: "Ir", exact: true }).click();
  await expect(page.getByRole("region", { name: "Caixa selecionada" })).toContainText("B-M3-N3-C02");
  await page.getByRole("button", { name: "Marcar todos" }).click();
  const mover = page.getByRole("button", { name: /^Mover \d+ documentos?$/ }).first();
  await mover.click();
  const secao = page.getByRole("region", { name: "Mover documentos" });
  await expect(secao).toBeVisible();
  await expect(secao.getByRole("button", { name: /^Mover \d+ documentos?$/ })).toBeDisabled();
  await secao.getByLabel("Rua").selectOption({ label: "Rua A" });
  await secao.getByRole("button", { name: "Próxima livre" }).click();
  await expect(secao.getByRole("status")).toContainText(/\d+ → \d+ de \d+/);
  await secao.getByRole("button", { name: /^Mover \d+ documentos?$/ }).click();
  await expect(page.getByText(/Modo demonstração|nada foi/)).toBeVisible();
});

test("3D: o galpão grande abre, aceita giro e mantém a taxa de quadros", async ({ page }) => {
  await page.goto("/mapa?galpao=grande&vista=perspectiva");
  const canvas = page.locator("canvas");
  await expect(canvas).toBeVisible({ timeout: 60_000 });
  await page.waitForTimeout(2000);
  // Mede os quadros enquanto o mouse gira a vista (o 3D só desenha quando algo muda).
  await page.evaluate(() => {
    const w = window as unknown as { __t: number[]; __parar: boolean };
    w.__t = [];
    w.__parar = false;
    const passo = (t: number) => {
      w.__t.push(t);
      if (!w.__parar) requestAnimationFrame(passo);
    };
    requestAnimationFrame(passo);
  });
  const c = (await canvas.boundingBox())!;
  await page.mouse.move(c.x + c.width / 2, c.y + c.height / 2);
  await page.mouse.down({ button: "right" });
  await page.mouse.move(c.x + c.width / 2 + 400, c.y + c.height / 2 + 60, { steps: 120 });
  await page.mouse.up({ button: "right" });
  const t = await page.evaluate(() => {
    const w = window as unknown as { __t: number[]; __parar: boolean };
    w.__parar = true;
    return w.__t;
  });
  const duracao = (t[t.length - 1] - t[0]) / 1000;
  const piorQuadro = Math.max(...t.slice(1).map((x, k) => x - t[k]));
  console.log(`girando o galpão grande, em software: ${(t.length / duracao).toFixed(1)} quadros/s, pior quadro ${piorQuadro.toFixed(0)} ms`);
  await page.screenshot({ path: "test-results/mapa-grande.png" });
  expect(t.length).toBeGreaterThan(10);
});
