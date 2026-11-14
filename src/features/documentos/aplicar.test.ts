import { describe, expect, it } from "vitest";
import { DOCUMENTOS_DEMO } from "@/features/demo/documentos";
import { aplicarFiltros } from "./aplicar";
import { lerFiltros } from "./filtros";

const docs = DOCUMENTOS_DEMO;
const buscar = (p: Record<string, string>) => aplicarFiltros(docs, lerFiltros(p), "2026-11-14");

describe("pesquisa em memória (mesmas regras do banco)", () => {
  it("sem filtro: 40 documentos, contagens batem com a lista", () => {
    const r = buscar({});
    expect(r.contagens.todos).toBe(docs.length);
    expect(r.contagens.licitacao + r.contagens.contrato).toBe(docs.length);
    expect(r.itens.length).toBeLessThanOrEqual(50);
  });
  it("acha pedaço do processo e da empresa, sem acento nem maiúscula", () => {
    expect(buscar({ q: "015/20" }).itens.map((i) => i.numero)).toContain("015/2023");
    expect(buscar({ q: "TECNOMED" }).contagens.todos).toBeGreaterThan(0);
    expect(buscar({ q: "ILUMINACAO" }).contagens.todos).toBeGreaterThan(0);
  });
  it("acha pelo CNPJ colado com pontuação", () => {
    const d = docs.find((x) => x.cnpj);
    expect(d).toBeTruthy();
    const c = d!.cnpj!;
    const formatado = `${c.slice(0, 2)}.${c.slice(2, 5)}.${c.slice(5, 8)}/${c.slice(8, 12)}-${c.slice(12)}`;
    expect(buscar({ q: formatado }).itens.map((i) => i.id)).toContain(d!.id);
  });
  it("modalidade só restringe licitações; contratos continuam", () => {
    const r = buscar({ modalidade: "dispensa" });
    expect(r.contagens.contrato).toBe(buscar({}).contagens.contrato);
    expect(r.contagens.licitacao).toBeLessThan(buscar({}).contagens.licitacao);
  });
  it("filtro de contrato restringe só contratos e leva a aba para Contratos", () => {
    const r = buscar({ situacao: "vigente" });
    expect(r.itens.every((i) => i.tipo === "contrato" && i.situacao === "vigente")).toBe(true);
    expect(r.total).toBe(r.contagens.contrato);
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
      "2026-11-14",
    );
    expect(so.itens.every((i) => i.secretaria_id === saude)).toBe(true);
  });
  it("pagina sem repetir", () => {
    const p1 = aplicarFiltros(docs, lerFiltros({}), "2026-11-14", 15);
    const p2 = aplicarFiltros(docs, lerFiltros({ cursor: p1.proximo!.id }), "2026-11-14", 15);
    expect(p1.itens.some((i) => p2.itens.some((j) => j.id === i.id))).toBe(false);
  });
});
