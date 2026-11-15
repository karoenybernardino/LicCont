import { describe, expect, it } from "vitest";
import { numerosDoNome, sugerirDocumento, type DocumentoSemPdf } from "./lote";

const docs: DocumentoSemPdf[] = [
  { id: "a", titulo: "Contrato 019/2015", numero: "019", ano: 2015 },
  { id: "b", titulo: "Pregão 008/2016", numero: "8", ano: 2016 },
  { id: "c", titulo: "Dispensa 008/2017", numero: "008", ano: 2017 },
  { id: "d", titulo: "Pregão 015/2023", numero: "015/2023", ano: 2023 },
];

describe("sugerirDocumento", () => {
  it("acha o número e o ano em formatos comuns de nome", () => {
    expect(numerosDoNome("contrato-019-2015.pdf")).toEqual([{ numero: "19", ano: 2015 }]);
    expect(numerosDoNome("Proc 8_2016 final.PDF")).toEqual([{ numero: "8", ano: 2016 }]);
    expect(numerosDoNome("scan0001.pdf")).toEqual([]);
  });
  it("sugere só quando há um candidato", () => {
    expect(sugerirDocumento("contrato-019-2015.pdf", docs)).toBe("a");
    expect(sugerirDocumento("8-2016.pdf", docs)).toBe("b");
    expect(sugerirDocumento("pregao_15-2023.pdf", docs)).toBe("d");
    expect(sugerirDocumento("scan0001.pdf", docs)).toBeNull();
    expect(sugerirDocumento("999-2015.pdf", docs)).toBeNull();
  });
  it("não repete documento já escolhido por outro arquivo", () => {
    expect(sugerirDocumento("019-2015.pdf", docs, new Set(["a"]))).toBeNull();
  });
});
