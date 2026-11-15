import { describe, expect, it } from "vitest";
import { aprovavelDesde, dataBR, observacaoTermo, classeDocumento, diasEntre, estadoDoPrazo, hojeSaoPaulo, mensagemDoBanco, somarAnos, type Regra } from "./regras";

const regras: Regra[] = [
  { classe: "contrato", corrente: 2, intermediaria: 3, destinacao: "eliminacao" },
  { classe: "licitacao", corrente: 1, intermediaria: 1, destinacao: "guarda_permanente" },
  { classe: "dispensa_inexigibilidade", corrente: 1, intermediaria: 1, destinacao: "eliminacao" },
];
const contrato = (fim: string | null) => ({ tipo: "contrato" as const, modalidade: null, vigencia_fim: fim, encerrado_em: null });

describe("classeDocumento", () => {
  it("separa contrato, dispensa/inexigibilidade e demais licitações", () => {
    expect(classeDocumento("contrato", null)).toBe("contrato");
    expect(classeDocumento("licitacao", "dispensa")).toBe("dispensa_inexigibilidade");
    expect(classeDocumento("licitacao", "inexigibilidade")).toBe("dispensa_inexigibilidade");
    expect(classeDocumento("licitacao", "pregao_eletronico")).toBe("licitacao");
  });
});

describe("somarAnos", () => {
  it("29/02 cai em 28/02 se o ano de chegada não é bissexto (como o Postgres)", () => {
    expect(somarAnos("2020-02-29", 1)).toBe("2021-02-28");
    expect(somarAnos("2020-02-29", 4)).toBe("2024-02-29");
  });
  it("31 de dezembro", () => expect(somarAnos("2010-12-31", 5)).toBe("2015-12-31"));
});

describe("estadoDoPrazo", () => {
  it("pronto no dia do vencimento (borda) e perto de vencer no dia anterior", () => {
    expect(estadoDoPrazo(contrato("2020-06-15"), regras, "2025-06-15")).toMatchObject({ estado: "pronto", emDias: 0 });
    expect(estadoDoPrazo(contrato("2020-06-15"), regras, "2025-06-14")).toMatchObject({ estado: "vence", emDias: 1 });
  });
  it("vence em até 90 dias; depois disso, vigente", () => {
    expect(estadoDoPrazo(contrato("2020-06-15"), regras, "2025-03-17")).toMatchObject({ estado: "vence", emDias: 90 });
    expect(estadoDoPrazo(contrato("2020-06-15"), regras, "2025-03-16")).toMatchObject({ estado: "vigente", emDias: 91 });
  });
  it("guarda permanente nunca fica pronto", () => {
    const d = { tipo: "licitacao" as const, modalidade: "concorrencia" as const, vigencia_fim: null, encerrado_em: "1990-01-01" };
    expect(estadoDoPrazo(d, regras, "2026-11-15")).toEqual({ estado: "permanente" });
  });
  it("sem regra e sem data não entram na fila", () => {
    expect(estadoDoPrazo(contrato(null), regras, "2026-11-15")).toEqual({ estado: "sem_data" });
    expect(estadoDoPrazo(contrato("2000-01-01"), [], "2026-11-15")).toEqual({ estado: "sem_regra" });
  });
  it("licitação conta do encerramento, não da vigência", () => {
    const d = { tipo: "licitacao" as const, modalidade: "dispensa" as const, vigencia_fim: null, encerrado_em: "2000-01-01" };
    expect(estadoDoPrazo(d, regras, "2026-11-15")).toMatchObject({ estado: "pronto", vencimento: "2002-01-01" });
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
