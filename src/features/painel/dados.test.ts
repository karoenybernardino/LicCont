import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/servidor", () => ({ clienteSessao: async () => null }));

describe("porcento", () => {
  it("arredonda e protege contra divisão por zero", async () => {
    const { porcento } = await import("./dados");
    expect(porcento(2728, 3842)).toBe(71);
    expect(porcento(377, 412)).toBe(92);
    expect(porcento(0, 0)).toBe(0);
    expect(porcento(1, 3)).toBe(33);
  });
});
