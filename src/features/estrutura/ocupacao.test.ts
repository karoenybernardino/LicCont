import { describe, expect, it } from "vitest";
import { codigoPosicao, media, percentual, proximaRua, resumir, type Estrutura } from "./ocupacao";

const estrutura: Estrutura = {
  galpoes: [{ id: "g", nome: "Galpão", ativo: true }],
  galpao: { id: "g", nome: "Galpão", ativo: true },
  ruas: [
    { id: "a", galpaoId: "g", codigo: "A", ativo: true },
    { id: "b", galpaoId: "g", codigo: "B", ativo: false },
  ],
  modulos: [
    { id: "a1", ruaId: "a", numero: 1, ativo: true },
    { id: "a2", ruaId: "a", numero: 2, ativo: false },
    { id: "b1", ruaId: "b", numero: 1, ativo: true },
  ],
  niveis: [
    { id: "n1", moduloId: "a1", numero: 1, capacidade: 4, caixas: 3, ativo: true },
    { id: "n2", moduloId: "a1", numero: 2, capacidade: 4, caixas: 0, ativo: true },
    { id: "n3", moduloId: "a1", numero: 3, capacidade: 4, caixas: 0, ativo: false },
    { id: "n4", moduloId: "a2", numero: 1, capacidade: 4, caixas: 0, ativo: true },
    { id: "n5", moduloId: "b1", numero: 1, capacidade: 9, caixas: 9, ativo: true },
  ],
};

describe("ocupação", () => {
  it("percentual arredonda e não divide por zero", () => {
    expect(percentual(1, 3)).toBe(33);
    expect(percentual(2, 3)).toBe(67);
    expect(percentual(0, 0)).toBe(0);
    expect(percentual(4, 4)).toBe(100);
  });

  it("soma só o que está ativo em toda a cadeia", () => {
    expect(resumir(estrutura)).toEqual({ modulos: 1, niveis: 2, caixas: 3, capacidade: 8, percentual: 38 });
    expect(resumir(estrutura, "b")).toEqual({ modulos: 0, niveis: 0, caixas: 0, capacidade: 0, percentual: 0 });
  });

  it("galpão vazio dá zero", () => {
    expect(resumir({ ...estrutura, ruas: [], modulos: [], niveis: [] }).percentual).toBe(0);
  });

  it("código da posição igual ao da etiqueta", () => {
    expect(codigoPosicao("B", 3, 3, 2)).toBe("B-M3-N3-C02");
    expect(codigoPosicao("AA", 12, 1, 15)).toBe("AA-M12-N1-C15");
    expect(codigoPosicao("C", 1)).toBe("C-M1");
  });

  it("próxima rua livre", () => {
    expect(proximaRua([])).toBe("A");
    expect(proximaRua(["A", "B", "D"])).toBe("C");
    expect(proximaRua([..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"])).toBe("AA");
  });

  it("média para os cartões", () => {
    expect(media(20, 4)).toBe(5);
    expect(media(3, 0)).toBe(0);
  });
});
