import { expect, it } from "vitest";
import { resumir } from "@/features/estrutura/ocupacao";
import { ESTRUTURA_DEMO } from "./estrutura";

it("estrutura da demonstração bate com os números do canvas", () => {
  const e = ESTRUTURA_DEMO;
  expect(resumir(e)).toMatchObject({ modulos: 20, niveis: 80 });
  expect(e.ruas.map((r) => resumir(e, r.id).percentual)).toEqual([94, 88, 76, 69]);
  expect(e.niveis.every((n) => n.caixas >= 0 && n.caixas <= n.capacidade)).toBe(true);
});
