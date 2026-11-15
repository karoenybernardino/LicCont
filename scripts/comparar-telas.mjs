// Compara a tela do sistema com o quadro do canvas, lado a lado.
// Uso: com a prévia de demonstração ligada (porta 3200),
//   node scripts/comparar-telas.mjs EditorPlantaEscuro EditorPlantaClaro
//   node scripts/comparar-telas.mjs --todos
// Opções: --base http://localhost:3200   --rota /mapa/editar (força a rota)
// Saída: test-results/comparacao/<Quadro>.png  (canvas à esquerda, sistema à direita)
import { chromium } from "@playwright/test";
import { readFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args.splice(i, 2)[1] : d; };
const base = opt("--base", "http://localhost:3200");
const rotaForcada = opt("--rota", null);
const todos = args.includes("--todos");
const telas = JSON.parse(readFileSync("docs/telas/telas.json", "utf8"));
const alvo = todos ? telas.filter((t) => t.rota.startsWith("/")) : telas.filter((t) => args.includes(t.quadro));
if (!alvo.length) { console.log("Informe o nome do quadro (veja docs/telas/telas.json) ou --todos."); process.exit(1); }

mkdirSync("test-results/comparacao", { recursive: true });
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME, args: ["--no-sandbox"] } : {});
for (const t of alvo) {
  const rota = rotaForcada ?? t.rota.split(" ")[0];
  if (!rota.startsWith("/") || rota.includes("[")) { console.log(`${t.quadro}: informe --rota (rota "${t.rota}")`); continue; }
  const ctx = await browser.newContext({ viewport: { width: t.largura, height: t.altura } });
  // Demonstração: perfil (PERFIL=administrador|coordenador|operador|consulta|equipe) e secretaria de Saúde.
  await ctx.addCookies([
    { name: "liccont_demo_perfil", value: process.env.PERFIL ?? "administrador", url: base },
    { name: "liccont_secretaria", value: "de100000-0000-0000-0000-000000000004", url: base },
  ]);
  const tema = t.tema === "claro" ? "light" : "dark";
  await ctx.addInitScript((v) => { try { localStorage.setItem("tema", v); } catch {} document.documentElement?.setAttribute("data-theme", v); }, tema);
  const app = await ctx.newPage();
  await app.goto(base + rota, { waitUntil: "networkidle" });
  await app.waitForTimeout(800);
  const sistema = (await app.screenshot()).toString("base64");
  const canvas = readFileSync(resolve("docs/telas", t.png)).toString("base64");
  const lado = await ctx.newPage();
  await lado.setViewportSize({ width: t.largura * 2 + 24, height: t.altura + 40 });
  await lado.setContent(`<body style="margin:0;background:#888;font:600 13px sans-serif">
    <div style="display:flex;gap:24px;padding:0">
      <div><div style="height:40px;line-height:40px;padding:0 8px">CANVAS · ${t.quadro}</div><img src="data:image/png;base64,${canvas}" width="${t.largura}"></div>
      <div><div style="height:40px;line-height:40px;padding:0 8px">SISTEMA · ${rota} (${t.tema})</div><img src="data:image/png;base64,${sistema}" width="${t.largura}"></div>
    </div></body>`);
  await lado.screenshot({ path: `test-results/comparacao/${t.quadro}.png`, fullPage: true });
  console.log(`ok  test-results/comparacao/${t.quadro}.png`);
  await ctx.close();
}
await browser.close();
