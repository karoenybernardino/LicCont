import { describe, expect, it } from "vitest";
import { auditoriaParaRelatorio, codigoLote, historicoParaCsv } from "./exportar";

describe("exportações da equipe", () => {
  it("monta o código do lote", () => {
    expect(codigoLote("2026-11-15T08:30:00Z", "abcd1234")).toBe("2026-1115-abcd");
  });
  it("CSV do histórico traz só números e erro em texto fixo", () => {
    const csv = historicoParaCsv([{ prefeitura: "Prefeitura Fictícia", origem: "agendada", situacao: "erro", novos: 0, duplicados: 0, jaExistentes: 0, erro: "indisponivel", iniciadaEm: "2026-11-15T05:04:00Z" }]);
    expect(csv).toContain("TCE fora do ar");
    expect(csv.split("\n")[0]).toContain("novos");
  });
  it("relatório de auditoria tem as cinco colunas", () => {
    const r = auditoriaParaRelatorio([{ id: 1, criadoEm: "2026-11-15T11:31:00Z", quem: "Sistema", acao: "tce.importar", statusNovo: null, prefeitura: null, ip: null }], ["Período: 7 dias"]);
    expect(r.colunas).toHaveLength(5);
    expect(r.linhas[0]).toEqual(["15/11 08:31", "Sistema", "Importação do TCE", "—", "—"]);
  });
});

import { aplicarFiltroAcao, lerFiltrosAuditoria } from "./exportar";

describe("filtros da auditoria", () => {
  it("ignora valor estranho", () => {
    expect(lerFiltrosAuditoria(new URLSearchParams("dias=99&prefeitura=x"))).toEqual({ dias: null, prefeitura: null, acao: null });
    expect(lerFiltrosAuditoria(new URLSearchParams("dias=30&acao=Prefeitura criada")).dias).toBe(30);
  });
  it("filtra pela frase da ação", () => {
    const a = { id: 1, criadoEm: "2026-11-15T11:31:00Z", quem: "Sistema", acao: "prefeituras.insert", statusNovo: null, prefeitura: null, ip: null };
    expect(aplicarFiltroAcao([a], "Prefeitura criada")).toHaveLength(1);
    expect(aplicarFiltroAcao([a], "Outra")).toHaveLength(0);
  });
});
