import { describe, expect, it } from "vitest";
import { folhasDeCaixas, folhasDeDocumentos, lerCaixasDaUrl } from "./esquemas";

const A = "3f2b8c1e-4d5a-4b6c-9d7e-0a1b2c3d4e5f";
const B = "4f2b8c1e-4d5a-4b6c-9d7e-0a1b2c3d4e5f";

describe("lerCaixasDaUrl", () => {
  it("lê ?caixas=a,b, ignora lixo e repetidos", () => {
    expect(lerCaixasDaUrl(`${A},lixo,${B},${A}`)).toEqual([A, B]);
    expect(lerCaixasDaUrl(undefined)).toEqual([]);
  });
});

describe("folhas", () => {
  it("caixa 2 por folha, documento 4 por folha", () => {
    expect([0, 1, 2, 3].map(folhasDeCaixas)).toEqual([0, 1, 1, 2]);
    expect([0, 1, 4, 5].map(folhasDeDocumentos)).toEqual([0, 1, 1, 2]);
  });
});
