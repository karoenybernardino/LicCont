import { describe, expect, it } from "vitest";
import { aprovavelDesde, dataBR, observacaoTermo, diasEntre, estadoDoPrazo, hojeSaoPaulo, mensagemDoBanco, somarAnos, type Regra } from "./regras";

const r = (id: string, o: Partial<Regra>): Regra => ({
  id, codigo: id, classe: id, grupoId: "g", grupo: "Licitações e Contratos", corrente: 0, intermediaria: 0, tipoPrazo: "fixo",
  destinacao: "eliminacao", observacao: null, ativa: true, ...o,
});
const regras: Regra[] = [
  r("cinco", { corrente: 5 }),
  r("lp", { tipoPrazo: "permanente", destinacao: "guarda_permanente" }),
  r("dois", { corrente: 1, intermediaria: 1 }),
];
const doc = (o: Partial<Parameters<typeof estadoDoPrazo>[0]>) => ({ classe_id: "cinco", ano: 2025, ...o });

describe("somarAnos", () => {
  it("29/02 cai em 28/02 se o ano de chegada não é bissexto (como o Postgres)", () => {
    expect(somarAnos("2020-02-29", 1)).toBe("2021-02-28");
    expect(somarAnos("2020-02-29", 4)).toBe("2024-02-29");
  });
  it("31 de dezembro", () => expect(somarAnos("2010-12-31", 5)).toBe("2015-12-31"));
});

describe("estadoDoPrazo (conta do fim do ano do documento)", () => {
  it("ano 2025 + 5 anos: libera em 01/01/2031, não em 31/12/2030", () => {
    expect(estadoDoPrazo(doc({}), regras, "2031-01-01")).toMatchObject({ estado: "pronto", vencimento: "2031-01-01", emDias: 0 });
    expect(estadoDoPrazo(doc({}), regras, "2030-12-31")).toMatchObject({ estado: "vence", emDias: 1 });
  });
  it("soma corrente e intermediária", () => {
    expect(estadoDoPrazo(doc({ classe_id: "dois", ano: 2000 }), regras, "2026-11-15")).toMatchObject({ estado: "pronto", vencimento: "2003-01-01" });
  });
  it("vence em até 90 dias; depois disso, vigente", () => {
    expect(estadoDoPrazo(doc({}), regras, "2030-10-03")).toMatchObject({ estado: "vence", emDias: 90 });
    expect(estadoDoPrazo(doc({}), regras, "2030-10-02")).toMatchObject({ estado: "vigente", emDias: 91 });
  });
  it("guarda permanente fica fora da fila", () => {
    expect(estadoDoPrazo(doc({ classe_id: "lp", ano: 1990 }), regras, "2026-11-15")).toEqual({ estado: "permanente" });
  });
  it("sem classe ou sem regra não entra na fila", () => {
    expect(estadoDoPrazo(doc({ classe_id: "x" }), [], "2026-11-15")).toEqual({ estado: "sem_regra" });
    expect(estadoDoPrazo(doc({ classe_id: null }), regras, "2026-11-15")).toEqual({ estado: "sem_regra" });
  });
});

describe("datas", () => {
  it("aprovação liberada em edital + 45 dias; dias entre datas", () => {
    expect(aprovavelDesde("2026-01-01")).toBe("2026-02-15");
    expect(diasEntre("2026-01-01", "2026-02-15")).toBe(45);
  });
  it("hoje no fuso de São Paulo (23h do dia 14 em SP ainda é dia 14)", () => {
    expect(hojeSaoPaulo(new Date("2026-11-15T02:00:00Z"))).toBe("2026-11-14");
  });
});

describe("termos na lista", () => {
  it("formata datas e escreve a observação de cada situação", () => {
    expect(dataBR("2026-11-10")).toBe("10/11/2026");
    expect(dataBR("2026-11-15T02:00:00Z")).toBe("14/11/2026");
    const base = { editalEm: null, aprovadoEm: null, canceladoEm: null };
    expect(observacaoTermo({ ...base, situacao: "rascunho" }, "2026-11-15")).toBe("falta registrar o edital");
    expect(observacaoTermo({ ...base, situacao: "em_ciencia", editalEm: "2026-10-01" }, "2026-11-15")).toBe("aprovação liberada desde 15/11");
    expect(observacaoTermo({ ...base, situacao: "em_ciencia", editalEm: "2026-10-01" }, "2026-11-14")).toBe("aprovação liberada em 15/11");
    expect(observacaoTermo({ ...base, situacao: "aprovado", aprovadoEm: "2026-09-30T12:00:00Z" }, "2026-11-15")).toBe("eliminados em 30/09/2026");
    expect(observacaoTermo({ ...base, situacao: "cancelado", canceladoEm: "2026-03-12T12:00:00Z" }, "2026-11-15")).toBe("cancelado em 12/03/2026");
  });
});

describe("mensagemDoBanco", () => {
  it("traduz o código e não repete dado do documento", () => {
    expect(mensagemDoBanco("LD005")).toMatch(/outro administrador/);
    expect(mensagemDoBanco("LD001", "documento não pode ser eliminado: emprestado")).toMatch(/emprestado/);
    expect(mensagemDoBanco("XX", "Contrato 019/2015")).not.toMatch(/Contrato/);
  });
});
