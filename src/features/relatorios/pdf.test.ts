import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { gerarRelatorioPdf, gerarRelatorioPlanilha } from "./pdf";
import { descreverFiltros, lerPedido, type Relatorio } from "./definicoes";

const base: Relatorio = {
  id: "emprestimos_atraso",
  titulo: "Empréstimos em atraso",
  linhasDeCabecalho: ["Todas as secretarias · 2 registros"],
  colunas: ["Documento", "Com", "Atraso"],
  larguras: [0.5, 0.3, 0.2],
  linhas: [["Contrato 041/2022", "Mário S.", "41 dias"], ["=HYPERLINK(\"x\")", "+cmd", "9 dias"]],
};
const moldura = { prefeitura: "Prefeitura Fictícia", emitidoEm: "15/11/2026", codigo: "2026-1115-0001" };

describe("gerarRelatorioPdf", () => {
  it("gera um PDF válido com a tabela", async () => {
    const bytes = await gerarRelatorioPdf(base, moldura);
    expect(new TextDecoder().decode(bytes.slice(0, 4))).toBe("%PDF");
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(1);
  });
  it("passa para várias páginas quando a tabela cresce, repetindo o cabeçalho", async () => {
    const grande = { ...base, linhas: Array.from({ length: 120 }, (_, i) => [`Documento ${i}`, "Pessoa", "1 dia"]) };
    const doc = await PDFDocument.load(await gerarRelatorioPdf(grande, moldura));
    expect(doc.getPageCount()).toBeGreaterThan(2);
  });
  it("aguenta lista vazia e caractere fora do alfabeto latino", async () => {
    await expect(gerarRelatorioPdf({ ...base, linhas: [] }, moldura)).resolves.toBeInstanceOf(Uint8Array);
    await expect(gerarRelatorioPdf({ ...base, linhas: [["日本語 ✓", "x", "y"]] }, moldura)).resolves.toBeInstanceOf(Uint8Array);
  });
});

describe("gerarRelatorioPlanilha", () => {
  it("neutraliza fórmulas e mantém o cabeçalho e as colunas", () => {
    const csv = gerarRelatorioPlanilha(base);
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toContain("Documento;Com;Atraso");
    expect(csv).toContain("'=HYPERLINK");
    expect(csv).toContain("'+cmd");
    expect(csv).not.toMatch(/(^|;|\n)=HYPERLINK/);
  });
});

describe("lerPedido", () => {
  it("aceita o que é válido e descarta o resto", () => {
    const p = lerPedido(new URLSearchParams("relatorio=descartes&formato=pdf&de=2026-01-01&ate=2026-12-31&secretaria=a1000000-0000-0000-0000-000000000000"));
    expect(p).toEqual({ id: "descartes", formato: "pdf", filtros: { secretaria: "a1000000-0000-0000-0000-000000000000", de: "2026-01-01", ate: "2026-12-31" } });
    const ruim = lerPedido(new URLSearchParams("relatorio=../../x&formato=docx&de=ontem&secretaria=1%27or%271"));
    expect(ruim).toEqual({ id: null, formato: null, filtros: { secretaria: null, de: null, ate: null } });
  });
  it("descreve os filtros em português", () => {
    expect(descreverFiltros({ secretaria: null, de: "2026-09-01", ate: "2026-11-15" }, null, true)).toBe("De 01/09/2026 a 15/11/2026 · Todas as secretarias");
    expect(descreverFiltros({ secretaria: null, de: null, ate: null }, "Saúde", false)).toBe("Saúde");
  });
});
