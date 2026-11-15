import { describe, expect, it } from "vitest";
import { avisoRuas, ocupacaoPorRua, posicaoLegivel } from "./resumo";
import type { Estrutura } from "@/features/estrutura/ocupacao";

const e: Estrutura = {
  galpoes: [],
  galpao: null,
  ruas: [
    { id: "a", galpaoId: "g", codigo: "A", ativo: true },
    { id: "b", galpaoId: "g", codigo: "B", ativo: true },
    { id: "c", galpaoId: "g", codigo: "C", ativo: false },
  ],
  modulos: [
    { id: "a1", ruaId: "a", numero: 1, ativo: true },
    { id: "b1", ruaId: "b", numero: 1, ativo: true },
  ],
  niveis: [
    { id: "n1", moduloId: "a1", numero: 1, capacidade: 10, caixas: 9, ativo: true },
    { id: "n2", moduloId: "b1", numero: 1, capacidade: 10, caixas: 5, ativo: true },
  ],
};

describe("inicio", () => {
  it("ocupação por rua só das ruas ativas", () => {
    expect(ocupacaoPorRua(e)).toEqual([
      { codigo: "A", percentual: 90 },
      { codigo: "B", percentual: 50 },
    ]);
  });
  it("aviso das ruas quase cheias", () => {
    expect(avisoRuas([{ codigo: "A", percentual: 94 }, { codigo: "B", percentual: 88 }, { codigo: "C", percentual: 76 }])).toBe("Ruas A e B quase cheias");
    expect(avisoRuas([{ codigo: "A", percentual: 90 }])).toBe("Rua A quase cheia");
    expect(avisoRuas([{ codigo: "A", percentual: 10 }])).toBe("Nenhuma rua quase cheia");
  });
  it("posição legível", () => {
    expect(posicaoLegivel("B-M3-N3-C02")).toBe("Rua B · M3 · N3 · C02");
  });
});
