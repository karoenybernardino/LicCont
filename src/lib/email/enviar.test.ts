import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { emailLigado, enviarEmail } = await import("./enviar");

const msg = { para: "alguem@exemplo.test", assunto: "Aviso", texto: "Texto" };
const env = { EMAIL_API_KEY: "chave-de-teste", EMAIL_REMETENTE: "avisos@exemplo.test" };

describe("enviarEmail", () => {
  it("sem chave fica desligado e não chama a rede", async () => {
    const envia = vi.fn();
    expect(emailLigado({})).toBe(false);
    expect(await enviarEmail(msg, {}, envia as unknown as typeof fetch)).toEqual({ enviado: false, motivo: "desligado" });
    expect(envia).not.toHaveBeenCalled();
  });
  it("com chave envia pelo serviço", async () => {
    const envia = vi.fn().mockResolvedValue({ ok: true });
    expect(await enviarEmail(msg, env, envia as unknown as typeof fetch)).toEqual({ enviado: true });
    expect(envia).toHaveBeenCalledOnce();
  });
  it("recusa endereço inválido, serviço que recusa e rede fora do ar", async () => {
    const ok = vi.fn().mockResolvedValue({ ok: false });
    expect(await enviarEmail({ ...msg, para: "sem-arroba" }, env, ok as unknown as typeof fetch)).toEqual({ enviado: false, motivo: "invalido" });
    expect(await enviarEmail(msg, env, ok as unknown as typeof fetch)).toEqual({ enviado: false, motivo: "recusado" });
    const cai = vi.fn().mockRejectedValue(new Error("rede"));
    expect(await enviarEmail(msg, env, cai as unknown as typeof fetch)).toEqual({ enviado: false, motivo: "indisponivel" });
  });
});
