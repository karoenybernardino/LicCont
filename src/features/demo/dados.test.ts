import { expect, it } from "vitest";
import { emDemo } from "./dados";

it("modo demonstração só liga em prévia ou desenvolvimento, sem chave de servidor", () => {
  expect(emDemo({ LICCONT_DEMO: "1", NODE_ENV: "development" })).toBe(true);
  expect(emDemo({ LICCONT_DEMO: "1", VERCEL_ENV: "preview", NODE_ENV: "production" })).toBe(true);
  expect(emDemo({ LICCONT_DEMO: "1", VERCEL_ENV: "production", NODE_ENV: "production" })).toBe(false);
  expect(emDemo({ LICCONT_DEMO: "1", NODE_ENV: "production" })).toBe(false);
  expect(emDemo({ LICCONT_DEMO: "1", NODE_ENV: "development", SUPABASE_SERVICE_ROLE_KEY: "x" })).toBe(false);
  expect(emDemo({ NODE_ENV: "development" })).toBe(false);
});
