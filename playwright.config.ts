import { defineConfig, devices } from "@playwright/test";

const porta = 3100;

export default defineConfig({
  testDir: "tests/e2e",
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL: `http://localhost:${porta}` },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  globalSetup: "./tests/e2e/preparar.ts",
  webServer: {
    command: `npm run build && npm run start -- -p ${porta}`,
    url: `http://localhost:${porta}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
