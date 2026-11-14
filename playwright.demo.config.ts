import { defineConfig, devices } from "@playwright/test";

// Testes do mapa na demonstração (sem Supabase): rodam só na máquina de quem
// desenvolve, com `npx playwright test -c playwright.demo.config.ts`. O servidor
// da prévia (`liccont-demo`, porta 3200) precisa estar de pé.
export default defineConfig({
  testDir: "tests/demo",
  timeout: 90_000,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3200",
    launchOptions: { args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 880 } } }],
});
