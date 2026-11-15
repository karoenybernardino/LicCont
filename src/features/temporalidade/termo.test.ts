import { describe, expect, it } from "vitest";
import { conteudoTermo } from "./termo";
import { gerarPdf } from "./pdf";
import { gerarWord } from "./word";

const base = {
  numero: 3, ano: 2026, prefeitura: "Prefeitura Fictícia", secretaria: "Saúde", geradoEm: "2026-11-15T12:00:00Z",
  observacao: null, editalEm: "2026-01-02", aprovadoEm: "2026-03-01T12:00:00Z",
  documentos: Array.from({ length: 80 }, (_, i) => ({
    titulo: `Contrato ${String(i + 1).padStart(3, "0")}/2005`, objeto: "Objeto fictício de teste com acentuação: manutenção, ação, coração.",
    caixa: "A-M1-N1-C01", inicio: "2005-01-01", fim: "2010-01-01", classe: "contrato" as const, extremos: "2005 – 2010", vencimento: "2020-01-01",
  })),
};

describe("conteudoTermo", () => {
  it("rascunho é só listagem e não autoriza eliminar", () => {
    const c = conteudoTermo({ ...base, situacao: "rascunho", editalEm: null, aprovadoEm: null });
    expect(c.titulo).toMatch(/^LISTAGEM/);
    expect(c.paragrafos.join(" ")).toMatch(/não autoriza/);
  });
  it("aprovado vira termo, com datas e total", () => {
    const c = conteudoTermo({ ...base, situacao: "aprovado" });
    expect(c.titulo).toBe("TERMO DE ELIMINAÇÃO DE DOCUMENTOS Nº 003/2026");
    expect(c.paragrafos.join(" ")).toMatch(/02\/01\/2026/);
    expect(c.rodape).toBe("Total: 80 documentos.");
    expect(c.arquivo).toBe("termo-eliminacao-003-2026");
  });
  it("não leva CPF nem nome de pessoa (só linhas de assinatura em branco)", () => {
    const c = conteudoTermo({ ...base, situacao: "aprovado" });
    expect(JSON.stringify(c)).not.toMatch(/\d{3}\.\d{3}\.\d{3}-\d{2}/);
  });
});

describe("arquivos", () => {
  it("gera PDF válido com várias páginas e Word (zip) sem derrubar acentos", async () => {
    const c = conteudoTermo({ ...base, situacao: "aprovado" });
    const pdf = await gerarPdf(c);
    expect(Buffer.from(pdf.slice(0, 5)).toString()).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(2000);
    const word = await gerarWord(c);
    expect(word.subarray(0, 2).toString()).toBe("PK");
  });
});
