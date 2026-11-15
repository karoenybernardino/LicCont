import { describe, expect, it } from "vitest";
import { gerarQr, urlDaCaixa } from "./qr";

const ID = "3f2b8c1e-4d5a-4b6c-9d7e-0a1b2c3d4e5f";

describe("QR local", () => {
  it("tamanho cresce com o texto e usa versão 1 a 6", () => {
    expect(gerarQr("OLA").length).toBe(21);
    const q = gerarQr(urlDaCaixa("https://liccont.exemplo.test", ID));
    expect([25, 29, 33, 37, 41]).toContain(q.length);
    expect(() => gerarQr("x".repeat(200))).toThrow();
  });

  it("tem os três localizadores e o módulo escuro fixo", () => {
    const q = gerarQr("OLA");
    const n = q.length;
    for (const [x, y] of [[0, 0], [n - 7, 0], [0, n - 7]]) {
      expect(q[y][x] && q[y][x + 6] && q[y + 6][x] && q[y + 6][x + 6] && q[y + 3][x + 3]).toBe(true);
      expect(q[y + 1][x + 1]).toBe(false);
    }
    expect(q[n - 8][8]).toBe(true);
  });

  it("é determinístico", () => {
    expect(gerarQr("abc")).toEqual(gerarQr("abc"));
  });

  it("a URL da caixa leva só o id, sem dado pessoal", () => {
    expect(urlDaCaixa("https://x.test/", ID)).toBe(`https://x.test/mapa?caixa=${ID}`);
  });
});
