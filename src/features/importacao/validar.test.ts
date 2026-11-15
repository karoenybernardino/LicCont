import { describe, expect, it } from "vitest";
import { faltando, mapaSeguro, sugerirMapa } from "./colunas";
import { chaveProcesso, errosParaLinhasCsv, lerData, validarLinhas } from "./validar";

const SEC = [{ id: "a1000000-0000-0000-0000-000000000000", nome: "Saúde" }];
const TITULOS = ["Tipo", "Número", "Ano", "Objeto", "Secretaria", "Situação", "Modalidade", "Empresa", "CNPJ", "Valor", "Início da vigência", "Fim da vigência"];
const mapa = sugerirMapa(TITULOS);
const linha = (o: Partial<Record<string, string>> = {}) => {
  const base: Record<string, string> = {
    Tipo: "Licitação", Número: "001/2024", Ano: "2024", Objeto: "Compra de material fictício", Secretaria: "saude",
    Situação: "Concluída", Modalidade: "Pregão Eletrônico", Empresa: "", CNPJ: "", Valor: "", "Início da vigência": "", "Fim da vigência": "",
  };
  return TITULOS.map((t) => o[t] ?? base[t]);
};

describe("colunas", () => {
  it("sugere o casamento pelo título, sem acento e sem repetir coluna", () => {
    expect(mapa.tipo).toBe(0);
    expect(mapa.situacao).toBe(5);
    expect(mapa.vigencia_fim).toBe(11);
    expect(faltando(mapa)).toEqual([]);
  });
  it("aponta o que falta", () => {
    expect(faltando(sugerirMapa(["Objeto"]))).toContain("Número do processo");
  });
  it("mapa do navegador: só índices válidos e sem repetir", () => {
    expect(mapaSeguro({ tipo: 0, numero: 1 }, 3)).toEqual({ tipo: 0, numero: 1 });
    expect(mapaSeguro({ tipo: 5 }, 3)).toBeNull();
    expect(mapaSeguro({ tipo: 1, numero: 1 }, 3)).toBeNull();
    expect(mapaSeguro({ tipo: "0" }, 3)).toBeNull();
    expect(mapaSeguro({ tipo: -1 }, 3)).toBeNull();
    expect(mapaSeguro(null, 3)).toBeNull();
  });
});

describe("lerData", () => {
  it("aceita dd/mm/aaaa, d/m/aa e ISO; recusa o resto", () => {
    expect(lerData("05/03/2024")).toBe("2024-03-05");
    expect(lerData("5/3/24")).toBe("2024-03-05");
    expect(lerData("2024-03-05")).toBe("2024-03-05");
    expect(lerData("")).toBeNull();
    expect(lerData("31/02/2024")).toBeUndefined();
    expect(lerData("ontem")).toBeUndefined();
  });
});

describe("validarLinhas", () => {
  it("linha boa vira dado pronto para gravar", () => {
    const c = validarLinhas([linha()], mapa, SEC, new Set());
    expect(c.erros).toEqual([]);
    expect(c.validas).toHaveLength(1);
    expect(c.validas[0].dados).toMatchObject({ tipo: "licitacao", modalidade: "pregao_eletronico", situacao: "concluida", ano: 2024, secretaria_id: SEC[0].id });
    expect(c.validas[0].linha).toBe(2);
  });
  it("contrato com vigência, valor e CNPJ", () => {
    const c = validarLinhas(
      [linha({ Tipo: "Contrato", Modalidade: "", Situação: "Vigente", Valor: "1.234,50", CNPJ: "00.000.000/0001-91", "Início da vigência": "01/01/2024", "Fim da vigência": "31/12/2024" })],
      mapa, SEC, new Set());
    expect(c.erros).toEqual([]);
    expect(c.validas[0].dados).toMatchObject({ valor: 1234.5, cnpj: "00000000000191", vigencia_fim: "2024-12-31", modalidade: null });
  });
  it("CPF no CNPJ vai para cpf_credor; CPF em texto livre é recusado", () => {
    const ok = validarLinhas([linha({ CNPJ: "529.982.247-25" })], mapa, SEC, new Set());
    expect(ok.validas[0].dados).toMatchObject({ cnpj: null, cpf_credor: "52998224725" });
    const ruim = validarLinhas([linha({ Objeto: "Compra para 529.982.247-25 fictício" })], mapa, SEC, new Set());
    expect(ruim.erros[0]).toMatchObject({ linha: 2, campo: "Objeto" });
  });
  it("erros trazem linha, campo e motivo fixo, nunca o conteúdo", () => {
    const c = validarLinhas([linha({ Tipo: "Outro", Secretaria: "Inexistente SA", Situação: "???" })], mapa, SEC, new Set());
    expect(c.erros.map((e) => e.campo)).toEqual(["Tipo (licitação ou contrato)", "Secretaria", "Situação"]);
    expect(JSON.stringify(c.erros)).not.toMatch(/Inexistente|Outro|\?\?\?/);
  });
  it("licitação sem modalidade, ano ruim e vigência em licitação são recusados", () => {
    expect(validarLinhas([linha({ Modalidade: "" })], mapa, SEC, new Set()).erros.length).toBeGreaterThan(0);
    expect(validarLinhas([linha({ Ano: "1800" })], mapa, SEC, new Set()).erros.length).toBeGreaterThan(0);
    expect(validarLinhas([linha({ "Início da vigência": "01/01/2024" })], mapa, SEC, new Set()).erros.length).toBeGreaterThan(0);
  });
  it("repetida no arquivo e já no sistema vão para 'pular', sem erro", () => {
    const existente = chaveProcesso({ tipo: "licitacao", modalidade: "pregao_eletronico", numero: "009/2024", ano: 2024 });
    const c = validarLinhas(
      [linha(), linha(), linha({ Número: "009/2024" }), linha({ Número: "002/2024" })],
      mapa, SEC, new Set([existente]));
    expect(c.validas.map((v) => v.linha)).toEqual([2, 5]);
    expect(c.repetidas).toEqual([{ linha: 3, motivo: "arquivo" }, { linha: 4, motivo: "sistema" }]);
    expect(c.erros).toEqual([]);
  });
  it("relatório de erros em CSV tem só linha, campo e motivo", () => {
    const rel = errosParaLinhasCsv([{ linha: 7, campo: "Ano", motivo: "Ano inválido." }]);
    expect(rel).toEqual([["Linha", "Campo", "Motivo"], ["7", "Ano", "Ano inválido."]]);
  });
});
