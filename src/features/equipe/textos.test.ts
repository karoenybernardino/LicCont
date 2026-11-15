import { describe, expect, it } from "vitest";
import { formatarGb, formatarReais, haTempo, quando, textoAcao } from "./textos";

const u = (m: number, d: number, h: number, mi = 0) => new Date(Date.UTC(2026, m, d, h + 3, mi)).toISOString(); // hora local de Brasília
const agora = new Date(u(10, 15, 12));

describe("textos da equipe", () => {
  it("traduz códigos de auditoria sem inventar", () => {
    expect(textoAcao("prefeituras.insert")).toBe("Prefeitura criada");
    expect(textoAcao("prefeituras.update", "ativa")).toContain("Ativa");
    expect(textoAcao("qualquer.coisa")).toBe("Ação registrada");
  });
  it("conta dias em linguagem simples", () => {
    expect(haTempo(u(10, 15, 1), agora)).toBe("hoje");
    expect(haTempo(u(10, 14, 23), agora)).toBe("ontem");
    expect(haTempo(u(10, 12, 9), agora)).toBe("há 3 dias");
    expect(haTempo(u(9, 1, 9), agora)).toBe("01/10");
  });
  it("formata data e hora", () => {
    expect(quando(u(10, 15, 2, 4), agora)).toBe("hoje, 02:04");
    expect(quando(u(10, 12, 14, 2), agora)).toBe("12/11, 14:02");
    expect(quando(null)).toBe("—");
  });
  it("formata valores e tamanho", () => {
    expect(formatarReais(null)).toBe("—");
    expect(formatarReais(150000)).toContain("1.500,00");
    expect(formatarGb(3_400_000_000)).toBe("3,2 GB");
  });
});
