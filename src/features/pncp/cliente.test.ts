import { describe, expect, it, vi } from "vitest";
import { ErroPncp, baixarArquivo, esquemaCompra, listarArquivos } from "./cliente";

const compra = { cnpj: "00000000000191", ano: 2026, sequencial: 21 };
const json = (corpo: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(corpo), { status }));
const pdf = (tamanho: number) => new Uint8Array([0x25, 0x50, 0x44, 0x46, ...new Array(Math.max(0, tamanho - 4)).fill(1)]);
const binario = (b: Uint8Array, status = 200, extra: Record<string, string> = {}) => Promise.resolve(new Response(b as BodyInit, { status, headers: extra }));

describe("esquemaCompra", () => {
  it("limpa a máscara do CNPJ e converte ano e número", () => {
    expect(esquemaCompra.parse({ cnpj: "00.000.000/0001-91", ano: "2026", sequencial: "21" })).toEqual(compra);
  });
  it("recusa CNPJ, ano e número fora do padrão (nada de montar URL com texto solto)", () => {
    expect(esquemaCompra.safeParse({ cnpj: "123", ano: 2026, sequencial: 1 }).success).toBe(false);
    expect(esquemaCompra.safeParse({ cnpj: compra.cnpj, ano: 1999, sequencial: 1 }).success).toBe(false);
    expect(esquemaCompra.safeParse({ cnpj: compra.cnpj, ano: 2026, sequencial: "1/../x" }).success).toBe(false);
  });
});

describe("listarArquivos", () => {
  it("devolve sequencial, título e tipo", async () => {
    const buscar = vi.fn().mockReturnValue(json([{ sequencialDocumento: 1, titulo: "Edital.pdf", tipoDocumentoNome: "Edital" }, { sequencialDocumento: 2 }]));
    const r = await listarArquivos(compra, { buscar });
    expect(r).toEqual([{ sequencial: 1, titulo: "Edital.pdf", tipo: "Edital" }, { sequencial: 2, titulo: "Arquivo 2", tipo: "" }]);
    expect(buscar.mock.calls[0][0]).toBe("https://pncp.gov.br/pncp-api/v1/orgaos/00000000000191/compras/2026/21/arquivos");
  });
  it("mapeia 404, queda e formato estranho para erros fixos", async () => {
    await expect(listarArquivos(compra, { buscar: () => json({}, 404) })).rejects.toMatchObject({ codigo: "nao_encontrado" });
    await expect(listarArquivos(compra, { buscar: () => json({}, 503) })).rejects.toMatchObject({ codigo: "indisponivel" });
    await expect(listarArquivos(compra, { buscar: () => Promise.reject(new Error("rede")) })).rejects.toMatchObject({ codigo: "indisponivel" });
    await expect(listarArquivos(compra, { buscar: () => json({ x: 1 }) })).rejects.toMatchObject({ codigo: "formato" });
  });
});

describe("baixarArquivo", () => {
  it("baixa um PDF dentro do limite", async () => {
    const r = await baixarArquivo(compra, 3, 1000, { buscar: () => binario(pdf(100)) });
    expect(r.length).toBe(100);
  });
  it("recusa o que passa do limite, pelo cabeçalho e pelo tamanho real", async () => {
    await expect(baixarArquivo(compra, 3, 50, { buscar: () => binario(pdf(10), 200, { "content-length": "999" }) })).rejects.toMatchObject({ codigo: "grande_demais" });
    await expect(baixarArquivo(compra, 3, 50, { buscar: () => binario(pdf(200)) })).rejects.toMatchObject({ codigo: "grande_demais" });
  });
  it("recusa o que não começa com %PDF", async () => {
    await expect(baixarArquivo(compra, 3, 1000, { buscar: () => binario(new Uint8Array([1, 2, 3, 4, 5])) })).rejects.toBeInstanceOf(ErroPncp);
  });
  it("recusa sequencial inválido sem chamar a rede", async () => {
    const buscar = vi.fn();
    await expect(baixarArquivo(compra, 0, 1000, { buscar })).rejects.toBeInstanceOf(ErroPncp);
    expect(buscar).not.toHaveBeenCalled();
  });
});
