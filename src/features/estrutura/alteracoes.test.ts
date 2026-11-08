import { expect, it } from "vitest";
import { agrupar, quando, type LinhaAuditoria } from "./alteracoes";
import type { Estrutura } from "./ocupacao";

const e: Estrutura = {
  galpoes: [],
  galpao: null,
  ruas: [{ id: "r", galpaoId: "g", codigo: "B", ativo: true }],
  modulos: [{ id: "m", ruaId: "r", numero: 3, ativo: true }],
  niveis: [{ id: "n", moduloId: "m", numero: 2, capacidade: 4, caixas: 0, ativo: true }],
};
const t1 = "2026-11-08T12:40:00Z";
const t2 = "2026-11-07T12:00:00Z";
const linha = (acao: string, criado_em: string, depois: Record<string, unknown>, antes: Record<string, unknown> | null = null): LinhaAuditoria => ({
  acao,
  alvo_tabela: acao.split(".")[0],
  criado_em,
  depois,
  antes,
});

it("agrupa inclusões da mesma operação e esconde os níveis criados com o módulo", () => {
  const linhas = [
    linha("caixas.insert", t1, { nivel_id: "n", numero: 2 }),
    linha("caixas.insert", t1, { nivel_id: "n", numero: 1 }),
    linha("niveis.insert", t2, { modulo_id: "m2", numero: 1 }),
    linha("modulos.insert", t2, { rua_id: "r", numero: 4 }),
    linha("niveis.update", t2, { modulo_id: "m", numero: 2, capacidade: 6, ativo: true }, { capacidade: 4, ativo: true }),
    linha("modulos.update", t2, { rua_id: "r", numero: 3, ativo: false }, { rua_id: "r", numero: 3, ativo: true }),
  ];
  expect(agrupar(linhas, e).map((a) => [a.titulo, a.detalhe, a.tipo])).toEqual([
    ["2 caixas adicionadas", "Rua B · M3 · N2", "Estrutura"],
    ["Módulo 4 adicionado", "Rua B", "Estrutura"],
    ["Nível 2 ajustado", "Rua B · M3", "Ajuste"],
    ["Módulo 3 desativado", "Rua B", "Ajuste"],
  ]);
});

it("data no fuso de Brasília", () => {
  const agora = new Date("2026-11-08T15:00:00Z");
  expect(quando(new Date("2026-11-08T12:40:00Z"), agora)).toBe("hoje, 09:40");
  expect(quando(new Date("2026-11-07T12:00:00Z"), agora)).toBe("ontem");
  expect(quando(new Date("2026-11-05T12:00:00Z"), agora)).toBe("05/11/2026");
});
