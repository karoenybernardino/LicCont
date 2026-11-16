import { describe, expect, it } from "vitest";
import { nivelArmazenamento, totaisUso, usoParaCsv } from "./uso";

const u = (n: number) => ({ prefeituraId: "x", secretarias: 1, usuarios: n, documentos: 10 * n, caixas: 2, bytesPdf: 100 * n, ultimoAcesso: null, loginsMes: n, limiteBytes: 1000 });
const linhas = [
  { nome: "Prefeitura A", status: "ativa", uso: u(2) },
  { nome: "=Prefeitura B", status: "implantacao", uso: undefined },
];

describe("relatório de uso", () => {
  it("soma só o que existe e conta ativas", () => {
    expect(totaisUso(linhas)).toEqual({ prefeituras: 2, ativas: 1, usuarios: 2, documentos: 20, bytesPdf: 200, loginsMes: 2 });
  });
  it("CSV traz totais, recusados e neutraliza fórmula", () => {
    const csv = usoParaCsv(linhas, 7);
    expect(csv).toContain("TOTAL;1 ativas");
    expect(csv).toContain("tentativas_recusadas_no_mes");
    expect(csv).toContain("'=Prefeitura B");
  });
  it("armazenamento: aviso a 80% e cheio a 100%", () => {
    expect(nivelArmazenamento({ bytesPdf: 799, limiteBytes: 1000 })).toEqual({ nivel: "ok", porcento: 79 });
    expect(nivelArmazenamento({ bytesPdf: 800, limiteBytes: 1000 })).toEqual({ nivel: "aviso", porcento: 80 });
    expect(nivelArmazenamento({ bytesPdf: 999, limiteBytes: 1000 })).toEqual({ nivel: "aviso", porcento: 99 });
    expect(nivelArmazenamento({ bytesPdf: 1000, limiteBytes: 1000 })).toEqual({ nivel: "cheio", porcento: 100 });
    expect(nivelArmazenamento({ bytesPdf: 5, limiteBytes: 0 })).toEqual({ nivel: "ok", porcento: 0 });
  });
});
