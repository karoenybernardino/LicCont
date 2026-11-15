import { afterEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
vi.mock("@/lib/supabase/servidor", () => ({ clienteServico: () => ({ rpc }) }));
vi.mock("@/features/sessao/dal", () => ({ origemDaRequisicao: async () => ({ ip: "203.0.113.7", aparelho: null }) }));
const { pedirDemonstracao } = await import("./acoes");

const form = (extra: Record<string, string> = {}) => {
  const f = new FormData();
  for (const [k, v] of Object.entries({ nome: "Pessoa Fictícia", orgao: "Prefeitura Fictícia", email: "a@exemplo.test", ...extra })) f.set(k, v);
  return f;
};

afterEach(() => {
  vi.unstubAllEnvs();
  rpc.mockReset();
});

describe("pedirDemonstracao", () => {
  it("sem PEDIDO_HMAC_SECRET falha de forma genérica e não grava", async () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "outra-coisa");
    const r = await pedirDemonstracao(undefined, form());
    expect(r?.erro).toMatch(/Não foi possível enviar/);
    expect(rpc).not.toHaveBeenCalled();
  });
  it("manda só hashes de e-mail e IP, com o segredo próprio", async () => {
    vi.stubEnv("PEDIDO_HMAC_SECRET", "segredo-de-teste");
    rpc.mockResolvedValue({ data: "ok", error: null });
    await pedirDemonstracao(undefined, form());
    const args = rpc.mock.calls[0][1];
    expect(args.p_email_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(args.p_ip_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(args.p_ip_hash)).not.toContain("203.0.113.7");
  });
  it("duplicado e limite por IP respondem igual ao sucesso", async () => {
    vi.stubEnv("PEDIDO_HMAC_SECRET", "segredo-de-teste");
    rpc.mockResolvedValueOnce({ data: "ok", error: null }).mockResolvedValueOnce({ data: "descartado", error: null });
    const a = await pedirDemonstracao(undefined, form());
    const b = await pedirDemonstracao(undefined, form());
    expect(b).toEqual(a);
    expect(a?.aviso).toBe("Pedido recebido. Respondemos em breve.");
  });
  it("teto global devolve erro genérico", async () => {
    vi.stubEnv("PEDIDO_HMAC_SECRET", "segredo-de-teste");
    rpc.mockResolvedValue({ data: "teto", error: null });
    const r = await pedirDemonstracao(undefined, form());
    expect(r?.erro).toMatch(/Não foi possível enviar/);
  });
});
