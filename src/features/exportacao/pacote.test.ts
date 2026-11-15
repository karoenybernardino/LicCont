import { describe, expect, it } from "vitest";
import { unzipSync, strFromU8 } from "fflate";
import { montarPacote, montarVolumes, LIMITE_VOLUME_BYTES } from "./pacote";

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

  it("registra no LEIA-ME as tabelas cortadas", () => {
    const f = unzipSync(montarPacote([], [], [], ["A tabela documentos foi cortada em 200000 linhas."]));
    expect(strFromU8(f["LEIA-ME.txt"])).toContain("documentos foi cortada");
  });
});

describe("montarVolumes", () => {
  it("planilhas no 1º volume e PDFs repartidos pelo limite de cada volume", () => {
    const pdf = (n: string) => ({ caminho: `${n}.pdf`, bytes: new Uint8Array(LIMITE_VOLUME_BYTES / 2 + 1), sha256: n });
    const v = montarVolumes([{ nome: "caixas", cabecalhos: ["id"], linhas: [["1"]] }], [pdf("a"), pdf("b"), pdf("c")], []);
    expect(v).toHaveLength(4);
    expect(Object.keys(unzipSync(v[0])).sort()).toEqual(["caixas.csv", "conferencia_sha256.csv"]);
    expect(Object.keys(unzipSync(v[1])).sort()).toEqual(["conferencia_sha256.csv", "pdfs/a.pdf"]);
  });
});
