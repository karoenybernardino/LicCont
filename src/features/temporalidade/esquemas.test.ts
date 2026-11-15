import { describe, expect, it } from "vitest";
import { esquemaEdital, esquemaTermo, lerRegra } from "./esquemas";

const form = (o: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.set(k, v);
  return f;
};
const ID = "d1000000-0000-4000-8000-000000000001";

describe("lerRegra", () => {
  it("aceita prazos inteiros de 0 a 50 anos", () => {
    const r = lerRegra(form({ classe: "contrato", corrente: "2", intermediaria: "3", destinacao: "eliminacao" }));
    expect(r.success && r.data).toMatchObject({ classe: "contrato", corrente: 2, intermediaria: 3 });
  });
  it("recusa prazo vazio, negativo, quebrado ou acima de 50", () => {
    for (const corrente of ["", "-1", "1.5", "51", "abc"]) {
      expect(lerRegra(form({ classe: "contrato", corrente, intermediaria: "3", destinacao: "eliminacao" })).success).toBe(false);
    }
  });
  it("recusa tipo e destinação fora da lista", () => {
    expect(lerRegra(form({ classe: "convenio", corrente: "1", intermediaria: "1", destinacao: "eliminacao" })).success).toBe(false);
    expect(lerRegra(form({ classe: "contrato", corrente: "1", intermediaria: "1", destinacao: "apagar" })).success).toBe(false);
  });
});

describe("esquemaTermo", () => {
  it("exige de 1 a 500 ids de documento", () => {
    expect(esquemaTermo.safeParse({ documentos: [ID], observacao: "" }).success).toBe(true);
    expect(esquemaTermo.safeParse({ documentos: [], observacao: null }).success).toBe(false);
    expect(esquemaTermo.safeParse({ documentos: ["1"], observacao: null }).success).toBe(false);
    expect(esquemaTermo.safeParse({ documentos: Array(501).fill(ID), observacao: null }).success).toBe(false);
  });
});

describe("esquemaEdital", () => {
  it("exige id e data AAAA-MM-DD", () => {
    expect(esquemaEdital.safeParse({ id: ID, data: "2026-11-15" }).success).toBe(true);
    expect(esquemaEdital.safeParse({ id: ID, data: "15/11/2026" }).success).toBe(false);
  });
});
