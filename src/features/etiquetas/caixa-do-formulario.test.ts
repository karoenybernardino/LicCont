import { describe, expect, it } from "vitest";
import { caixaDoFormulario } from "./caixa-do-formulario";

const base = { orgao: "" as const, localizacao: null, tipo: "licitacao" as const, modalidade: "", numero: "", ano: "2026", secretaria: "Saúde", objeto: "Merenda" };

describe("caixaDoFormulario", () => {
  it("sem caixa nem classe: valores neutros", () => {
    const c = caixaDoFormulario(base);
    expect([c.numero, c.localizacao, c.titulo, c.orgao]).toEqual(["0000", "–", "LICITAÇÃO – 2026", "prefeitura"]);
    expect(c.itens[0].numeroAno).toBe("–");
  });
  it("com caixa da Câmara e contrato", () => {
    const c = caixaDoFormulario({ ...base, orgao: "camara", sequencial: 7, tipo: "contrato", numero: "12" });
    expect([c.numero, c.orgao, c.titulo, c.itens[0].modalidade, c.itens[0].numeroAno]).toEqual(["0007", "camara", "CONTRATO – 2026", "Contrato", "12/2026"]);
  });
});
