import { describe, expect, it } from "vitest";
import { Conferidor } from "./conferencia";
import { cnpjValido, cpfValido, esquemaDocumento } from "./esquemas";
import { abreviarSha, descreverArquivo, formatarTamanho, lerValor } from "./formato";
import { lerFiltros, paraQuery } from "./filtros";
import { tituloDocumento } from "./titulo";

const U = "11111111-1111-4111-8111-111111111111";
const base = {
  tipo: "licitacao", modalidade: "pregao_eletronico", numero: "015/2023", ano: "2023",
  objeto: "Aquisição de equipamentos", empresa: "", cnpj: "", valor: "", secretaria: U, caixa: U,
  situacao: "concluida", vigencia_inicio: "", vigencia_fim: "",
  classe: U, data_producao: "2023-03-01",
};

describe("título", () => {
  it("monta modalidade e número", () => {
    expect(tituloDocumento({ tipo: "licitacao", modalidade: "pregao_eletronico", numero: "015/2023", ano: 2023 })).toBe("Pregão Eletrônico 015/2023");
    expect(tituloDocumento({ tipo: "contrato", modalidade: null, numero: "041", ano: 2022 })).toBe("Contrato 041/2022");
  });
});

describe("classificação", () => {
  it("exige classe e data do documento; tipologia, observação e evento são opcionais", () => {
    expect(esquemaDocumento.safeParse(base).success).toBe(true);
    expect(esquemaDocumento.safeParse({ ...base, classe: "" }).success).toBe(false);
    expect(esquemaDocumento.safeParse({ ...base, data_producao: "" }).success).toBe(false);
    expect(esquemaDocumento.safeParse({ ...base, data_producao: "2999-01-01" }).success).toBe(false);
    const r = esquemaDocumento.safeParse({ ...base, tipologia: "", observacao: "", volume: "" });
    expect(r.success && [r.data.tipologia, r.data.observacao, r.data.volume]).toEqual([null, null, 1]);
  });
  it("observação não leva CPF", () => {
    expect(esquemaDocumento.safeParse({ ...base, observacao: "Servidor 123.456.789-09" }).success).toBe(false);
  });
  it("documento de outro grupo: tipo outro, situação arquivado, sem modalidade nem vigência", () => {
    const outro = { ...base, tipo: "outro", modalidade: "", situacao: "arquivado" };
    expect(esquemaDocumento.safeParse(outro).success).toBe(true);
    expect(esquemaDocumento.safeParse({ ...outro, situacao: "vigente" }).success).toBe(false);
    expect(esquemaDocumento.safeParse({ ...outro, modalidade: "dispensa" }).success).toBe(false);
    expect(esquemaDocumento.safeParse({ ...outro, vigencia_fim: "2024-01-01" }).success).toBe(false);
  });
  it("título do documento de outro grupo usa a tipologia", () => {
    expect(tituloDocumento({ tipo: "outro", modalidade: null, numero: "12", ano: 2020, tipologia: "Ofício" })).toBe("Ofício 12/2020");
    expect(tituloDocumento({ tipo: "outro", modalidade: null, numero: "12", ano: 2020 })).toBe("Documento 12/2020");
  });
});

describe("formato", () => {
  it("tamanho e descrição do arquivo", () => {
    expect(formatarTamanho(2.4 * 1024 * 1024)).toBe("2,4 MB");
    expect(descreverArquivo("pregao.pdf", 38, 2.4 * 1024 * 1024)).toBe("pregao.pdf · 38 páginas · 2,4 MB");
  });
  it("SHA-256 abreviado (4 + 4) ou nada", () => {
    expect(abreviarSha("9f2c" + "0".repeat(56) + "a71e")).toBe("9f2c…a71e");
    expect(abreviarSha(null)).toBeNull();
  });
  it("valor em reais", () => {
    expect(lerValor("1.234,56")).toBe(1234.56);
    expect(lerValor("")).toBeNull();
    expect(lerValor("abc")).toBeNaN();
  });
});

describe("cadastro", () => {
  it("aceita o mínimo e normaliza vazios", () => {
    const r = esquemaDocumento.safeParse(base);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toMatchObject({ empresa: null, cnpj: null, valor: null, ano: 2023 });
  });
  it("encerramento: só licitação, não no futuro e não antes do ano do processo", () => {
    expect(esquemaDocumento.safeParse({ ...base, encerrado_em: "2023-06-01" }).success).toBe(true);
    expect(esquemaDocumento.safeParse({ ...base, encerrado_em: "2999-01-01" }).success).toBe(false);
    expect(esquemaDocumento.safeParse({ ...base, encerrado_em: "2022-12-31" }).success).toBe(false);
    expect(esquemaDocumento.safeParse({ ...base, tipo: "contrato", modalidade: "", situacao: "vigente", encerrado_em: "2023-06-01" }).success).toBe(false);
  });
  it("licitação exige modalidade; situação segue o tipo", () => {
    expect(esquemaDocumento.safeParse({ ...base, modalidade: "" }).success).toBe(false);
    expect(esquemaDocumento.safeParse({ ...base, situacao: "vigente" }).success).toBe(false);
    expect(esquemaDocumento.safeParse({ ...base, tipo: "contrato", modalidade: "", situacao: "vigente" }).success).toBe(true);
  });
  it("vigência: fim depois do início, e só em contrato", () => {
    const c = { ...base, tipo: "contrato", modalidade: "", situacao: "vigente" };
    expect(esquemaDocumento.safeParse({ ...c, vigencia_inicio: "2023-05-01", vigencia_fim: "2023-04-01" }).success).toBe(false);
    expect(esquemaDocumento.safeParse({ ...c, vigencia_inicio: "2023-05-01", vigencia_fim: "2024-04-30" }).success).toBe(true);
    expect(esquemaDocumento.safeParse({ ...base, vigencia_fim: "2024-04-30" }).success).toBe(false);
  });
  it("CNPJ e CPF com dígito verificador; CPF vai para coluna própria", () => {
    expect(cnpjValido("11222333000181")).toBe(true);
    expect(cnpjValido("11222333000182")).toBe(false);
    expect(esquemaDocumento.safeParse({ ...base, cnpj: "11.222.333/0001-81" }).success).toBe(true);
    expect(esquemaDocumento.safeParse({ ...base, cnpj: "111.111.111-11" }).success).toBe(false);
    const cpf = esquemaDocumento.safeParse({ ...base, cnpj: "123.456.789-09" });
    expect(cpf.success && cpf.data).toMatchObject({ cnpj: null, cpf_credor: "12345678909" });
    const pj = esquemaDocumento.safeParse({ ...base, cnpj: "11.222.333/0001-81" });
    expect(pj.success && pj.data).toMatchObject({ cnpj: "11222333000181", cpf_credor: null });
    expect(cpfValido("12345678909")).toBe(true);
    expect(cpfValido("12345678900")).toBe(false);
  });
  it("valor em reais", () => {
    const r = esquemaDocumento.safeParse({ ...base, valor: "1.250.000,50" });
    expect(r.success && r.data.valor).toBe(1250000.5);
    expect(esquemaDocumento.safeParse({ ...base, valor: "-1" }).success).toBe(false);
  });
});

describe("filtros da URL", () => {
  it("ida e volta", () => {
    const f = lerFiltros({ q: "tecnomed", aba: "licitacao", de: "2022", modalidade: "dispensa" });
    expect(f).toMatchObject({ q: "tecnomed", aba: "licitacao", de: 2022, modalidade: "dispensa", ordem: "recentes" });
    expect(lerFiltros(Object.fromEntries(new URLSearchParams(paraQuery(f))))).toEqual(f);
  });
  it("filtro de contrato leva a aba para Contratos", () => {
    expect(lerFiltros({ situacao: "vigente" })).toMatchObject({ aba: "contrato", situacao: "vigente" });
  });
  it("valor inválido na URL vira sem filtro", () => {
    expect(lerFiltros({ aba: "x", de: "abc", modalidade: "inventada", secretaria: "não-é-uuid" })).toMatchObject({
      aba: "todos", de: null, modalidade: null, secretaria: null,
    });
  });
});

describe("conferência do PDF", () => {
  const conferir = (partes: string[], limite = 1000) => {
    const c = new Conferidor(limite);
    partes.forEach((p) => c.add(Buffer.from(p)));
    return c.fim();
  };
  it("aceita PDF inteiro e dá o hash", () => {
    const r = conferir(["%PDF-1.7\n1 0 obj", "\n%%EOF\n"]);
    expect(r.ok && r.sha256).toHaveLength(64);
  });
  it("recusa o que não é PDF, o incompleto, o com senha e o grande", () => {
    expect(conferir(["MZ não sou pdf %%EOF"])).toEqual({ ok: false, motivo: "nao_pdf" });
    expect(conferir(["%PDF-1.7 cortado no meio"])).toEqual({ ok: false, motivo: "incompleto" });
    expect(conferir(["%PDF-1.7 trailer << /Encrypt 5 0 R >>\n%%EOF"])).toEqual({ ok: false, motivo: "com_senha" });
    expect(conferir(["%PDF-1.7 /Enc", "rypt 5 0 R\n%%EOF"])).toEqual({ ok: false, motivo: "com_senha" });
    expect(conferir(["%PDF-1.7 " + "x".repeat(2000) + "\n%%EOF"], 1000)).toEqual({ ok: false, motivo: "grande_demais" });
    expect(conferir([])).toEqual({ ok: false, motivo: "nao_pdf" });
  });
});

describe("CPF em texto livre", () => {
  it("recusa CPF no objeto e na empresa, aceita CNPJ e números comuns", () => {
    expect(esquemaDocumento.safeParse({ ...base, objeto: "Serviço para João CPF 123.456.789-09" }).success).toBe(false);
    expect(esquemaDocumento.safeParse({ ...base, empresa: "Fulano 12345678909" }).success).toBe(false);
    expect(esquemaDocumento.safeParse({ ...base, objeto: "Contrato com 12.345.678/0001-95 e 5.000 itens" }).success).toBe(true);
  });
});

describe("faixa de valor da pesquisa", () => {
  it("a faixa vira vmin e vmax, e vmin e vmax valem sozinhos", async () => {
    const { lerFiltros, faixaDeValor } = await import("./filtros");
    expect(lerFiltros({ valor: "50000-200000" })).toMatchObject({ vmin: 50000, vmax: 200000, aba: "contrato" });
    expect(lerFiltros({ valor: "1000000-" })).toMatchObject({ vmin: 1000000, vmax: null });
    expect(lerFiltros({ valor: "-50000" })).toMatchObject({ vmin: null, vmax: 50000 });
    expect(lerFiltros({ vmin: "10", vmax: "20", valor: "50000-200000" })).toMatchObject({ vmin: 10, vmax: 20 });
    expect(lerFiltros({ valor: "lixo; drop" })).toMatchObject({ vmin: null, vmax: null, aba: "todos" });
    expect(faixaDeValor(0, 50000)).toBe("0-50000");
    expect(faixaDeValor(null, null)).toBe("");
  });
});
