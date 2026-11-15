import { describe, expect, it } from "vitest";
import { ErroPlanilha, LIMITE_LINHAS, celulaParaTexto, lerCsv, lerPlanilha, neutralizarCelula, paraCsv } from "./planilha";

const bytes = (t: string) => new TextEncoder().encode(t);

describe("lerPlanilha (csv)", () => {
  it("lê títulos e linhas com ponto e vírgula e aspas", async () => {
    const p = await lerPlanilha("a.csv", bytes('Número;Objeto;Ano\n001/2024;"Compra; de material";2024\n'));
    expect(p.cabecalhos).toEqual(["Número", "Objeto", "Ano"]);
    expect(p.linhas).toEqual([["001/2024", "Compra; de material", "2024"]]);
  });
  it("detecta vírgula, remove BOM e completa linhas curtas", async () => {
    const p = await lerPlanilha("a.CSV", bytes("﻿a,b,c\n1,2\n"));
    expect(p.linhas).toEqual([["1", "2", ""]]);
  });
  it("ignora linhas em branco", async () => {
    const p = await lerPlanilha("a.csv", bytes("a;b\n\n1;2\n;\n"));
    expect(p.linhas).toEqual([["1", "2"]]);
  });
  it("recusa vazia, só títulos e passa de 5.000 linhas", async () => {
    await expect(lerPlanilha("a.csv", bytes(""))).rejects.toBeInstanceOf(ErroPlanilha);
    await expect(lerPlanilha("a.csv", bytes("a;b\n"))).rejects.toBeInstanceOf(ErroPlanilha);
    const grande = "a;b\n" + Array.from({ length: LIMITE_LINHAS + 1 }, (_, i) => `${i};x`).join("\n");
    await expect(lerPlanilha("a.csv", bytes(grande))).rejects.toThrow(/5000 linhas/);
  });
  it("recusa .xlsm, .xls e extensão desconhecida, sem citar o nome do arquivo", async () => {
    for (const nome of ["segredo-joao.xlsm", "segredo-joao.xls", "segredo-joao.txt"]) {
      const erro = await lerPlanilha(nome, bytes("a;b\n1;2")).catch((e) => e);
      expect(erro).toBeInstanceOf(ErroPlanilha);
      expect(erro.message).not.toContain("joao");
    }
  });
  it("recusa ZIP disfarçado de .csv e .xlsx que não é ZIP", async () => {
    await expect(lerPlanilha("a.csv", new Uint8Array([0x50, 0x4b, 3, 4]))).rejects.toBeInstanceOf(ErroPlanilha);
    await expect(lerPlanilha("a.xlsx", bytes("a;b\n1;2"))).rejects.toBeInstanceOf(ErroPlanilha);
  });
  it("recusa arquivo grande demais", async () => {
    await expect(lerPlanilha("a.csv", new Uint8Array(10 * 1024 * 1024 + 1))).rejects.toThrow(/10 MB/);
  });
  it("xlsx corrompido dá erro fixo, sem vazar detalhe", async () => {
    const erro = await lerPlanilha("a.xlsx", new Uint8Array([0x50, 0x4b, 3, 4, 0, 0, 0])).catch((e) => e);
    expect(erro).toBeInstanceOf(ErroPlanilha);
    expect(erro.message).toMatch(/corrompido/);
  });
});

describe("lerCsv", () => {
  it("aspas duplas escapadas e quebra de linha dentro do campo", () => {
    expect(lerCsv('a;b\n"x ""y"" z";"linha1\nlinha2"\n')).toEqual([["a", "b"], ['x "y" z', "linha1\nlinha2"]]);
  });
  it("aceita CRLF", () => {
    expect(lerCsv("a;b\r\n1;2\r\n")).toEqual([["a", "b"], ["1", "2"]]);
  });
});

describe("celulaParaTexto", () => {
  it("normaliza tipos", () => {
    expect(celulaParaTexto(null)).toBe("");
    expect(celulaParaTexto(12.5)).toBe("12.5");
    expect(celulaParaTexto(true)).toBe("true");
    expect(celulaParaTexto(new Date("2024-03-05T00:00:00Z"))).toBe("2024-03-05");
    expect(celulaParaTexto(new Date("x"))).toBe("");
    expect(celulaParaTexto("  oi\u0000 ")).toBe("oi");
  });
});

describe("exportação", () => {
  it("neutraliza = + - @ no começo da célula", () => {
    for (const c of ["=SOMA(A1)", "+1", "-2", "@x", "\tx"]) expect(neutralizarCelula(c).startsWith("'")).toBe(true);
    expect(neutralizarCelula("normal")).toBe("normal");
  });
  it("gera CSV com BOM, aspas e fórmula neutralizada", () => {
    const csv = paraCsv([["a", "b;c"], ["=1+1", 'x"y']]);
    expect(csv).toBe("﻿a;\"b;c\"\r\n'=1+1;\"x\"\"y\"\r\n");
  });
});
