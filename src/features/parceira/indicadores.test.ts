import { describe, expect, it } from "vitest";
import { caixasPorOrgao, emAlertaDeOcupacao, etiquetas, evolucaoCaixas, inicioDaSemana, ocupacaoDe, producaoPorPessoa, totaisPorPessoa, type Linha, type Resumo } from "./indicadores";

const l = (dia: string, pessoa: string | null, orgao: Linha["orgao"], caixas: number, documentos = 0, etq = 0): Linha => ({ dia, usuarioId: pessoa, pessoa, orgao, caixas, documentos, etiquetas: etq });
const r = (id: string, o: Partial<Resumo> = {}): Resumo => ({ id, nome: id, caixas: 0, caixasPrefeitura: 0, caixasCamara: 0, documentos: 0, aEtiquetar: 0, funcionarios: 0, modulos: 1, caixasPorModulo: 36, ultimaAtividade: null, ...o });

describe("indicadores da empresa parceira", () => {
  it("semana começa na segunda", () => {
    expect(inicioDaSemana("2026-11-15")).toBe("2026-11-09"); // domingo
    expect(inicioDaSemana("2026-11-09")).toBe("2026-11-09");
  });
  it("soma caixas por órgão", () => {
    expect(caixasPorOrgao([r("a", { caixasPrefeitura: 3, caixasCamara: 1 }), r("b", { caixasPrefeitura: 2 })])).toEqual({ prefeitura: 5, camara: 1, total: 6 });
  });
  it("evolução semanal e mensal por órgão", () => {
    const ls = [l("2026-11-09", "Ana", "prefeitura", 2), l("2026-11-12", "Ana", "camara", 1), l("2026-11-16", "Bia", "prefeitura", 4), l("2026-12-01", "Bia", "prefeitura", 1), l("2026-11-10", "Ana", null, 0, 5)];
    expect(evolucaoCaixas(ls, "semana")).toEqual([
      { periodo: "2026-11-09", prefeitura: 2, camara: 1, total: 3 },
      { periodo: "2026-11-16", prefeitura: 4, camara: 0, total: 4 },
      { periodo: "2026-11-30", prefeitura: 1, camara: 0, total: 1 },
    ]);
    expect(evolucaoCaixas(ls, "mes").map((x) => [x.periodo, x.total])).toEqual([["2026-11", 7], ["2026-12", 1]]);
  });
  it("alerta de ocupação só acima de 90%", () => {
    expect(ocupacaoDe(r("a", { caixas: 32, modulos: 1, caixasPorModulo: 36 }))).toMatchObject({ total: 36, percentual: 89, alerta: false });
    expect(ocupacaoDe(r("a", { caixas: 33, modulos: 1, caixasPorModulo: 36 }))).toMatchObject({ percentual: 92, alerta: true });
    expect(ocupacaoDe(r("a", { caixas: 5, modulos: 0 }))).toMatchObject({ total: 0, percentual: 0, alerta: false });
    expect(emAlertaDeOcupacao([r("x", { caixas: 30 }), r("y", { caixas: 35 }), r("z", { caixas: 34 })]).map((x) => x.id)).toEqual(["y", "z"]);
  });
  it("produção por pessoa ignora quem não é da empresa", () => {
    const ls = [l("2026-11-09", "Ana", "prefeitura", 2, 3), l("2026-11-09", "Ana", "camara", 1, 0), l("2026-11-10", "Bia", "prefeitura", 0, 4), l("2026-11-10", null, "prefeitura", 9, 9)];
    expect(producaoPorPessoa(ls)).toEqual([
      { pessoa: "Bia", periodo: "2026-11-10", caixas: 0, documentos: 4 },
      { pessoa: "Ana", periodo: "2026-11-09", caixas: 3, documentos: 3 },
    ]);
    expect(producaoPorPessoa(ls, "semana")).toHaveLength(2);
    expect(totaisPorPessoa(ls).map((x) => [x.pessoa, x.caixas, x.documentos])).toEqual([["Ana", 3, 3], ["Bia", 0, 4]]);
  });
  it("etiquetas impressas e pendentes", () => {
    const ls = [l("2026-11-01", "Ana", null, 0, 0, 10), l("2026-11-10", "Ana", null, 0, 0, 5)];
    expect(etiquetas(ls, [r("a", { aEtiquetar: 4 }), r("b"), r("c", { aEtiquetar: 1 })], "2026-11-05")).toEqual({ impressas: 5, pendentes: 5, prefeiturasComPendencia: 2 });
  });
});
