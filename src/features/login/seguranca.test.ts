import { describe, expect, it, vi } from "vitest";
import { hashEmail, ipDaRequisicao, verificarSenhaVazada } from "./seguranca";

describe("hashEmail", () => {
  it("gera HMAC-SHA256 em hexadecimal, sem o e-mail em claro", () => {
    const hash = hashEmail("Pessoa@Exemplo.test ", "s".repeat(32));
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).toBe(hashEmail("pessoa@exemplo.test", "s".repeat(32)));
    expect(hash).not.toBe(hashEmail("pessoa@exemplo.test", "t".repeat(32)));
  });
});

describe("ipDaRequisicao", () => {
  it("usa x-real-ip e cai para o primeiro de x-forwarded-for", () => {
    expect(ipDaRequisicao(new Headers({ "x-real-ip": "203.0.113.7" }))).toBe("203.0.113.7");
    expect(ipDaRequisicao(new Headers({ "x-forwarded-for": "198.51.100.2, 10.0.0.1" }))).toBe("198.51.100.2");
    expect(ipDaRequisicao(new Headers({ "x-forwarded-for": "2001:db8::1" }))).toBe("2001:db8::1");
  });

  it("descarta valor que não é IP", () => {
    expect(ipDaRequisicao(new Headers({ "x-real-ip": "'; drop table" }))).toBeNull();
    expect(ipDaRequisicao(new Headers())).toBeNull();
  });
});

describe("verificarSenhaVazada", () => {
  // SHA-1 de "senha-de-teste": 5 primeiros caracteres vão na URL, o resto fica aqui.
  const senha = "senha-de-teste";
  const sha1 = "B8D3A6A1C5C1B9D6C4C6F2D8D8E0B9E4B2F0A1C3";

  function resposta(corpo: string, ok = true) {
    return vi.fn(async (url: string) => {
      expect(url).toMatch(/^https:\/\/api\.pwnedpasswords\.com\/range\/[0-9A-F]{5}$/);
      return { ok, text: async () => corpo } as Response;
    });
  }

  it("envia só os 5 primeiros caracteres do SHA-1 e acha a senha vazada", async () => {
    const { createHash } = await import("node:crypto");
    const real = createHash("sha1").update(senha).digest("hex").toUpperCase();
    const buscar = resposta(`0000000000000000000000000000000000A:0\r\n${real.slice(5)}:42\r\n`);
    expect(await verificarSenhaVazada(senha, buscar)).toBe("vazada");
    expect(buscar.mock.calls[0][0]).toBe(`https://api.pwnedpasswords.com/range/${real.slice(0, 5)}`);
    expect(JSON.stringify(buscar.mock.calls)).not.toContain(senha);
  });

  it("ignora linhas de enchimento (contagem zero) e devolve livre", async () => {
    expect(await verificarSenhaVazada(senha, resposta(`${sha1.slice(5)}:0\r\n`))).toBe("livre");
  });

  it("devolve indisponível se o serviço falhar", async () => {
    expect(await verificarSenhaVazada(senha, resposta("", false))).toBe("indisponivel");
    const erro = vi.fn(async () => {
      throw new Error("rede");
    });
    expect(await verificarSenhaVazada(senha, erro)).toBe("indisponivel");
  });
});
