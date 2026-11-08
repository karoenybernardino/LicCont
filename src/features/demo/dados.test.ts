import { expect, it } from "vitest";
import { emDemo } from "./dados";

it("modo demonstração só liga com LICCONT_DEMO=1 e nunca em Production", () => {
  expect(emDemo({ LICCONT_DEMO: "1" })).toBe(true);
  expect(emDemo({ LICCONT_DEMO: "1", VERCEL_ENV: "preview" })).toBe(true);
  expect(emDemo({ LICCONT_DEMO: "1", VERCEL_ENV: "production" })).toBe(false);
  expect(emDemo({})).toBe(false);
});
