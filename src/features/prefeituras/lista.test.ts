import { describe, expect, it } from "vitest";
import { filtrarPrefeituras, formatarCnpj, type PrefeituraLista } from "./lista";

const base = { criadoEm: "2026-11-08T12:00:00Z", administradores: 0, plano: "completo", contratoInicio: null, implantacaoCentavos: null, mensalidadeCentavos: null, tceCodigo: null };
const itens: PrefeituraLista[] = [
  { id: "1", nome: "Prefeitura de Caririaçu", cnpj: "06738132000100", status: "implantacao", ...base },
  { id: "2", nome: "Câmara Municipal", cnpj: "11111111000111", status: "ativa", ...base },
];

describe("lista de prefeituras da equipe", () => {
  it("busca por nome (sem acento ou caixa) e por CNPJ só com números", () => {
    expect(filtrarPrefeituras(itens, "caririacu", "todas").map((p) => p.id)).toEqual(["1"]);
    expect(filtrarPrefeituras(itens, "06.738.132", "todas").map((p) => p.id)).toEqual(["1"]);
  });
  it("filtra pela situação", () => {
    expect(filtrarPrefeituras(itens, "", "ativa").map((p) => p.id)).toEqual(["2"]);
    expect(filtrarPrefeituras(itens, "", "suspensa")).toEqual([]);
  });
  it("formata o CNPJ", () => {
    expect(formatarCnpj("06738132000100")).toBe("06.738.132/0001-00");
  });
});
