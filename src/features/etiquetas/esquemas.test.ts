import { describe, expect, it } from "vitest";
import { esquemaImpressao, lerCaixasDaUrl } from "./esquemas";

const A = "3f2b8c1e-4d5a-4b6c-9d7e-0a1b2c3d4e5f";
const B = "4f2b8c1e-4d5a-4b6c-9d7e-0a1b2c3d4e5f";

describe("esquemaImpressao", () => {
  it("aceita ids e tamanho conhecidos", () => {
    expect(esquemaImpressao.safeParse({ caixas: [A, B], tamanho: "media" }).success).toBe(true);
  });
  it("recusa lista vazia, id inválido, tamanho desconhecido e lote enorme", () => {
    expect(esquemaImpressao.safeParse({ caixas: [], tamanho: "media" }).success).toBe(false);
    expect(esquemaImpressao.safeParse({ caixas: ["x"], tamanho: "media" }).success).toBe(false);
    expect(esquemaImpressao.safeParse({ caixas: [A], tamanho: "gigante" }).success).toBe(false);
    expect(esquemaImpressao.safeParse({ caixas: Array(201).fill(A), tamanho: "media" }).success).toBe(false);
  });
});

describe("lerCaixasDaUrl", () => {
  it("lê ?caixas=a,b, ignora lixo e repetidos", () => {
    expect(lerCaixasDaUrl(`${A},lixo,${B},${A}`)).toEqual([A, B]);
    expect(lerCaixasDaUrl(undefined)).toEqual([]);
  });
});
