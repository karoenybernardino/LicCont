import { describe, expect, it } from "vitest";
import { DOCUMENTOS_DEMO } from "@/features/demo/documentos";
import { aplicarFiltros } from "./aplicar";
import { lerFiltros } from "./filtros";

const docs = DOCUMENTOS_DEMO;
const buscar = (p: Record<string, string>) => aplicarFiltros(docs, lerFiltros(p));

describe("pesquisa em memória (mesmas regras do banco)", () => {
  it("sem filtro: 40 documentos, contagens batem com a lista", () => {
    const r = buscar({});
    expect(r.contagens.todos).toBe(docs.length);
    expect(r.contagens.licitacao + r.contagens.contrato).toBe(docs.length);
    expect(r.itens.length).toBeLessThanOrEqual(50);
  });
  it("acha pedaço do processo e do objeto, sem acento nem maiúscula", () => {
    expect(buscar({ q: "015/20" }).itens.map((i) => i.numero)).toContain("015/2023");
    expect(buscar({ q: "ILUMINACAO" }).contagens.todos).toBeGreaterThan(0);
  });
  it("acha pelo título do processo", () => {
    const d = docs.find((x) => x.titulo_processo)!;
    expect(buscar({ q: d.titulo_processo! }).itens.map((i) => i.id)).toContain(d.id);
  });
  it("modalidade só restringe licitações; contratos continuam", () => {
    const r = buscar({ modalidade: "dispensa" });
    expect(r.contagens.contrato).toBe(buscar({}).contagens.contrato);
    expect(r.contagens.licitacao).toBeLessThan(buscar({}).contagens.licitacao);
  });
  it("órgão: só da Câmara ou só da Prefeitura, somando o total", () => {
    const camara = buscar({ orgao: "camara" });
    const pref = buscar({ orgao: "prefeitura" });
    expect(camara.total).toBeGreaterThan(0);
    expect(camara.itens.every((i) => i.orgao === "camara")).toBe(true);
    expect(camara.total + pref.total).toBe(docs.length);
    expect(buscar({ orgao: "outro" }).total).toBe(docs.length);
  });
  it("fundo, setor e mês são da caixa: a demonstração não tem, nada casa", () => {
    expect(buscar({ fundo: "Câmara" }).total).toBe(0);
    expect(buscar({ mes: "3" }).total).toBe(0);
  });
  it("período e secretaria valem para os dois tipos", () => {
    const r = buscar({ de: "2020", ate: "2022" });
    expect(r.itens.every((i) => i.ano >= 2020 && i.ano <= 2022)).toBe(true);
  });
  it("só as secretarias passadas entram (consulta não vê a Saúde de outro)", () => {
    const saude = docs.find((d) => d.numero === "015/2023")!.secretaria_id;
    const so = aplicarFiltros(
      docs.filter((d) => d.secretaria_id === saude),
      lerFiltros({}),
    );
    expect(so.itens.every((i) => i.secretaria_id === saude)).toBe(true);
  });
  it("pagina sem repetir", () => {
    const p1 = aplicarFiltros(docs, lerFiltros({}), 15);
    const p2 = aplicarFiltros(docs, lerFiltros({ cursor: p1.proximo!.id }), 15);
    expect(p1.itens.some((i) => p2.itens.some((j) => j.id === i.id))).toBe(false);
  });
});
