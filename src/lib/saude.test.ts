import { describe, expect, it, vi } from "vitest";
import { conferirSaude } from "./saude";

describe("rota de saúde", () => {
  it("ok quando banco e Storage respondem", async () => {
    expect(await conferirSaude({ banco: async () => true, storage: async () => true })).toEqual({ status: "ok", banco: "ok", storage: "ok" });
  });

  it("falha quando uma parte falha ou lança erro", async () => {
    expect(await conferirSaude({ banco: async () => false, storage: async () => true })).toEqual({ status: "falha", banco: "falha", storage: "ok" });
    expect(await conferirSaude({ banco: async () => true, storage: async () => { throw new Error("x"); } })).toEqual({ status: "falha", banco: "ok", storage: "falha" });
  });

  it("falha quando uma parte demora mais de 5 s", async () => {
    vi.useFakeTimers();
    const r = conferirSaude({ banco: () => new Promise(() => {}), storage: async () => true });
    await vi.advanceTimersByTimeAsync(5000);
    expect(await r).toEqual({ status: "falha", banco: "falha", storage: "ok" });
    vi.useRealTimers();
  });
});
