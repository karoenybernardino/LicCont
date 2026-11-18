import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { LINHAS_POR_FOLHA, folhasDoConteudo } from "./esquemas";
import { gerarEtiquetasPdf, type CaixaPdf, type DocumentoPdf, type MarcaPdf } from "./pdf";

const marca: MarcaPdf = { orgaoNome: "Prefeitura de Teste", logoOrgao: null, logoParceira: null };
const item = (i: number) => ({ modalidade: "Pregão eletrônico", numeroAno: `${String(i).padStart(3, "0")}/2026`, secretaria: "Saúde", objeto: `Objeto fictício número ${i} com texto bem comprido para forçar o corte da linha`, volume: 1 });
const caixa = (n: number, itens: number, volume: CaixaPdf["volume"] = null): CaixaPdf => ({
  numero: String(n).padStart(4, "0"), titulo: "LICITAÇÃO – 2026", volume, classe: "Licitações e Contratos", tipologia: n % 2 ? "Processos licitatórios" : null,
  codigo: "031", prazo: "12 anos após o término do contrato", localizacao: "Rua B · Módulo 2 · Nível 4", url: `https://liccont.exemplo.test/q/${"a".repeat(32)}`,
  itens: Array.from({ length: itens }, (_, i) => item(i + 1)),
});
const doc = (i: number, obs: string | null): DocumentoPdf => ({
  titulo: `Pregão ${i}/2026`, secretaria: "Administração", objeto: "Serviço de digitalização de documentos com acentuação: ção ê ü", data: "12/02/2026", observacao: obs,
  classe: "Licitações e Contratos", codigo: "031", caixa: "0001", localizacao: "Rua B · Módulo 2 · Nível 4", url: `https://liccont.exemplo.test/q/${"b".repeat(32)}`,
});
const paginas = async (b: Uint8Array) => (await PDFDocument.load(b)).getPageCount();

describe("etiquetas em PDF", () => {
  it("caixas: duas por folha deitada", async () => {
    const pdf = await PDFDocument.load(await gerarEtiquetasPdf({ marca, caixas: [caixa(1, 39, { n: 1, total: 2 }), caixa(2, 2), caixa(3, 4)] }));
    expect(pdf.getPageCount()).toBe(2);
    const { width, height } = pdf.getPage(0).getSize();
    expect(width).toBeGreaterThan(height);
  });
  it("folha de conteúdo pagina: 39 itens são 3 folhas", async () => {
    expect(folhasDoConteudo(39)).toBe(3);
    expect(folhasDoConteudo(0)).toBe(1);
    expect(folhasDoConteudo(LINHAS_POR_FOLHA)).toBe(1);
    expect(folhasDoConteudo(LINHAS_POR_FOLHA + 1)).toBe(2);
    expect(await paginas(await gerarEtiquetasPdf({ marca, conteudos: [caixa(1, 39, { n: 1, total: 2 })] }))).toBe(3);
  });
  it("documentos: quatro por folha em pé", async () => {
    const docs = [doc(1, "Falta o termo aditivo"), doc(2, null), doc(3, null), doc(4, null), doc(5, null)];
    const pdf = await PDFDocument.load(await gerarEtiquetasPdf({ marca, documentos: docs }));
    expect(pdf.getPageCount()).toBe(2);
    const { width, height } = pdf.getPage(0).getSize();
    expect(height).toBeGreaterThan(width);
  });
  it("tipos juntos saem num PDF só, na ordem caixa, conteúdo, documento", async () => {
    const b = await gerarEtiquetasPdf({ marca, caixas: [caixa(1, 3)], conteudos: [caixa(1, 3)], documentos: [doc(1, null)] });
    expect(await paginas(b)).toBe(3);
    expect(new TextDecoder().decode(b.slice(0, 5))).toBe("%PDF-");
  });
  it("logo ilegível não derruba a geração; sem nada, sai uma página", async () => {
    const b = await gerarEtiquetasPdf({ marca: { ...marca, logoOrgao: new Uint8Array([1, 2, 3]) }, caixas: [caixa(1, 1)] });
    expect(await paginas(b)).toBe(1);
    expect(await paginas(await gerarEtiquetasPdf({ marca }))).toBe(1);
  });
});
