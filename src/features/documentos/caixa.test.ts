import { describe, expect, it } from "vitest";
import { alternarMes, preencherPorCodigo } from "./caixa";

describe("cadastro de caixa", () => {
  it("o código preenche classe e prazo; permanente não tem prazo em anos", () => {
    const c = { classeId: "c1", grupoId: "g1", codigo: "031", nome: "Licitações", prazoAnos: 12, permanente: false };
    expect(preencherPorCodigo(c)).toEqual({ classeId: "c1", grupoId: "g1", prazo: "12", permanente: false });
    expect(preencherPorCodigo({ ...c, permanente: true })?.prazo).toBe("");
    expect(preencherPorCodigo(null)).toBeNull();
  });
  it("meses: marcar um ou vários, sempre em ordem e sem repetir", () => {
    expect(alternarMes([], 3)).toEqual([3]);
    expect(alternarMes([3], 1)).toEqual([1, 3]);
    expect(alternarMes([1, 3], 3)).toEqual([1]);
  });
});
