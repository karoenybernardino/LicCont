import { afterEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
const remove = vi.fn().mockResolvedValue({});
vi.mock("@/lib/supabase/servidor", () => ({ clienteServico: () => ({ rpc, storage: { from: () => ({ remove }) } }) }));
const { GET } = await import("./route");

const pede = (auth?: string) => new Request("http://x/api/limpeza/envios", { headers: auth ? { authorization: auth } : {} });

afterEach(() => {
  vi.unstubAllEnvs();
  rpc.mockReset();
  remove.mockClear();
});

describe("limpeza de envios abandonados", () => {
  it("sem CRON_SECRET fica desligada", async () => {
    expect((await GET(pede("Bearer qualquer"))).status).toBe(404);
    expect(rpc).not.toHaveBeenCalled();
  });
  it("recusa segredo errado ou ausente", async () => {
    vi.stubEnv("CRON_SECRET", "segredo-de-teste");
    expect((await GET(pede())).status).toBe(404);
    expect((await GET(pede("Bearer errado"))).status).toBe(404);
    expect(rpc).not.toHaveBeenCalled();
  });
  it("com o segredo limpa e devolve só a contagem", async () => {
    vi.stubEnv("CRON_SECRET", "segredo-de-teste");
    rpc.mockImplementation(async (nome: string) => ({
      data: { limpar_envios_todos: [{ caminho: "p/a.pdf", miniatura: "p/a.webp" }], limpar_pedidos_demonstracao: 2, exportacoes_vencidas: [{ caminho: "p/x.zip" }] }[nome],
      error: null,
    }));
    const r = await GET(pede("Bearer segredo-de-teste"));
    expect(await r.json()).toEqual({ limpos: 1, pedidos: 2, exportacoes: 1 });
    expect(remove).toHaveBeenCalledTimes(3);
  });
});
