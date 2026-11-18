import { describe, expect, it } from "vitest";
import { esquemaEdital, esquemaModelo, esquemaTermo } from "./esquemas";

const ID = "d1000000-0000-4000-8000-000000000001";

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

describe("esquemaModelo", () => {
  it("aceita texto e até 6 assinaturas", () => {
    expect(esquemaModelo.safeParse({ tipo: "eliminacao", baseLegal: "Texto", assinaturas: "A\nB" }).success).toBe(true);
    expect(esquemaModelo.safeParse({ tipo: "eliminacao", baseLegal: "Texto", assinaturas: "1\n2\n3\n4\n5\n6\n7" }).success).toBe(false);
  });
  it("recusa vazio e texto longo", () => {
    expect(esquemaModelo.safeParse({ tipo: "eliminacao", baseLegal: " ", assinaturas: "A" }).success).toBe(false);
    expect(esquemaModelo.safeParse({ tipo: "eliminacao", baseLegal: "x".repeat(1501), assinaturas: "A" }).success).toBe(false);
  });
});
