import { describe, expect, it } from "vitest";
import { unzipSync, strFromU8 } from "fflate";
import { montarPacote } from "./pacote";

describe("montarPacote", () => {
  it("junta CSVs, PDFs e conferência; neutraliza fórmula; lista o que ficou fora", () => {
    const zip = montarPacote(
      [{ nome: "documentos", cabecalhos: ["numero", "objeto"], linhas: [["001/2024", "=HYPERLINK(\"x\")"]] }],
      [{ caminho: "a.pdf", bytes: new Uint8Array([37, 80, 68, 70]), sha256: "ab" }],
      [["d1", "acima do limite"]],
    );
    const f = unzipSync(zip);
    expect(Object.keys(f).sort()).toEqual(["conferencia_sha256.csv", "documentos.csv", "pdfs/a.pdf", "pdfs_nao_incluidos.csv"]);
    expect(strFromU8(f["documentos.csv"])).toContain("'=HYPERLINK");
    expect(strFromU8(f["conferencia_sha256.csv"])).toContain("pdfs/a.pdf;ab");
  });
});
