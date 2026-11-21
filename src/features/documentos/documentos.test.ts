import { describe, expect, it } from "vitest";
import { Conferidor } from "./conferencia";
import { cnpjValido, cpfValido, esquemaCaixa, esquemaCodigoClasse, esquemaDocumento } from "./esquemas";
import { abreviarSha, descreverArquivo, formatarTamanho } from "./formato";
import { lerFiltros, paraQuery } from "./filtros";
import { tituloDocumento } from "./titulo";

const U = "11111111-1111-4111-8111-111111111111";
const base = {
  tipo: "licitacao", modalidade: "pregao_eletronico", numero: "015/2023", ano: "2023",
  objeto: "Aquisição de equipamentos", orgao: "prefeitura", secretaria: U, caixa: U, classe: U,
};

describe("título", () => {
  it("monta modalidade e número", () => {
    expect(tituloDocumento({ tipo: "licitacao", modalidade: "pregao_eletronico", numero: "015/2023", ano: 2023 })).toBe("Pregão Eletrônico 015/2023");
    expect(tituloDocumento({ tipo: "contrato", modalidade: null, numero: "041", ano: 2022 })).toBe("Contrato 041/2022");
  });
});

describe("classificação", () => {
  it("exige classe e órgão; tipologia, observação e título do processo são opcionais", () => {
    expect(esquemaDocumento.safeParse(base).success).toBe(true);
    expect(esquemaDocumento.safeParse({ ...base, classe: "" }).success).toBe(false);
    expect(esquemaDocumento.safeParse({ ...base, orgao: "" }).success).toBe(false);
    expect(esquemaDocumento.safeParse({ ...base, orgao: "estado" }).success).toBe(false);
    const r = esquemaDocumento.safeParse({ ...base, tipologia: "", observacao: "", titulo_processo: "", volume: "" });
    expect(r.success && [r.data.tipologia, r.data.observacao, r.data.titulo_processo, r.data.volume]).toEqual([null, null, null, 1]);
  });
  it("a Câmara pode guardar documento na caixa da Prefeitura: o órgão é do cadastro", () => {
    const r = esquemaDocumento.safeParse({ ...base, orgao: "camara" });
    expect(r.success && r.data.orgao).toBe("camara");
  });
  it("observação e título não levam CPF", () => {
    expect(esquemaDocumento.safeParse({ ...base, observacao: "Servidor 123.456.789-09" }).success).toBe(false);
    expect(esquemaDocumento.safeParse({ ...base, titulo_processo: "Fulano 12345678909" }).success).toBe(false);
  });
  it("documento de outro grupo: tipo outro, sem modalidade", () => {
    const outro = { ...base, tipo: "outro", modalidade: "" };
    expect(esquemaDocumento.safeParse(outro).success).toBe(true);
    expect(esquemaDocumento.safeParse({ ...outro, modalidade: "dispensa" }).success).toBe(false);
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
});

describe("cadastro", () => {
  it("aceita o mínimo e normaliza vazios", () => {
    const r = esquemaDocumento.safeParse(base);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toMatchObject({ titulo_processo: null, observacao: null, ano: 2023, orgao: "prefeitura" });
  });
  it("não leva mais empresa, valor, situação, vigência nem datas", () => {
    const r = esquemaDocumento.safeParse({ ...base, empresa: "X", valor: "10", situacao: "concluida", vigencia_fim: "2024-01-01", data_producao: "2023-03-01" });
    expect(r.success).toBe(true);
    if (r.success) for (const k of ["empresa", "valor", "situacao", "vigencia_fim", "data_producao", "encerrado_em", "evento_em", "cnpj"]) expect(k in r.data).toBe(false);
  });
  it("licitação exige modalidade; contrato e documento não levam", () => {
    expect(esquemaDocumento.safeParse({ ...base, modalidade: "" }).success).toBe(false);
    expect(esquemaDocumento.safeParse({ ...base, tipo: "contrato", modalidade: "" }).success).toBe(true);
    expect(esquemaDocumento.safeParse({ ...base, tipo: "contrato" }).success).toBe(false);
  });
  it("CNPJ e CPF com dígito verificador (conta de validação)", () => {
    expect(cnpjValido("11222333000181")).toBe(true);
    expect(cnpjValido("11222333000182")).toBe(false);
    expect(cpfValido("12345678909")).toBe(true);
    expect(cpfValido("12345678900")).toBe(false);
  });
});

describe("caixa", () => {
  const caixa = { id: U, orgao: "camara", tipo: "geral" };
  it("aceita o mínimo; vazios viram nulo e meses vira lista vazia", () => {
    const r = esquemaCaixa.safeParse({ ...caixa, fundo: "", setor: "", ano_limite: "", codigo_classificacao: "", classe: "", tipologia: "", prazo_anos: "" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toMatchObject({ fundo: null, setor: null, ano_limite: null, codigo_classificacao: null, classe: null, prazo_anos: null, meses: [], digitalizada: false, etiqueta_geral: false });
  });
  it("órgão e tipo são obrigatórios e fechados", () => {
    expect(esquemaCaixa.safeParse({ ...caixa, orgao: "" }).success).toBe(false);
    expect(esquemaCaixa.safeParse({ ...caixa, tipo: "mista" }).success).toBe(false);
  });
  it("meses: um ou vários, de 1 a 12, sem repetir e em ordem", () => {
    const r = esquemaCaixa.safeParse({ ...caixa, meses: "3,1,3" });
    expect(r.success && r.data.meses).toEqual([1, 3]);
    expect(esquemaCaixa.safeParse({ ...caixa, meses: ["4"] }).success).toBe(true);
    expect(esquemaCaixa.safeParse({ ...caixa, meses: "13" }).success).toBe(false);
    expect(esquemaCaixa.safeParse({ ...caixa, meses: "0" }).success).toBe(false);
  });
  it("etiqueta geral e digitalizada vêm de caixas de seleção", () => {
    const r = esquemaCaixa.safeParse({ ...caixa, tipo: "detalhada", etiqueta_geral: "on", digitalizada: "on" });
    expect(r.success && [r.data.etiqueta_geral, r.data.digitalizada]).toEqual([true, true]);
  });
  it("código da classificação, prazo e ano limite têm formato e limite", () => {
    expect(esquemaCodigoClasse.safeParse(" 031.2 ").success).toBe(true);
    expect(esquemaCodigoClasse.safeParse("03 1").success).toBe(false);
    expect(esquemaCaixa.safeParse({ ...caixa, codigo_classificacao: "a b" }).success).toBe(false);
    expect(esquemaCaixa.safeParse({ ...caixa, prazo_anos: "100" }).success).toBe(false);
    expect(esquemaCaixa.safeParse({ ...caixa, ano_limite: "1800" }).success).toBe(false);
  });
});

describe("filtros da URL", () => {
  it("ida e volta", () => {
    const f = lerFiltros({ q: "tecnomed", aba: "licitacao", de: "2022", modalidade: "dispensa", orgao: "camara", fundo: "Câmara", setor: "Compras", mes: "4" });
    expect(f).toMatchObject({ q: "tecnomed", aba: "licitacao", de: 2022, modalidade: "dispensa", orgao: "camara", fundo: "Câmara", setor: "Compras", mes: 4, ordem: "recentes" });
    expect(lerFiltros(Object.fromEntries(new URLSearchParams(paraQuery(f))))).toEqual(f);
  });
  it("valor inválido na URL vira sem filtro", () => {
    expect(lerFiltros({ aba: "x", de: "abc", modalidade: "inventada", secretaria: "não-é-uuid", orgao: "estado", mes: "13" })).toMatchObject({
      aba: "todos", de: null, modalidade: null, secretaria: null, orgao: null, mes: null,
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
  it("recusa CPF no objeto, aceita CNPJ e números comuns", () => {
    expect(esquemaDocumento.safeParse({ ...base, objeto: "Serviço para João CPF 123.456.789-09" }).success).toBe(false);
    expect(esquemaDocumento.safeParse({ ...base, objeto: "Contrato com 12.345.678/0001-95 e 5.000 itens" }).success).toBe(true);
  });
});
