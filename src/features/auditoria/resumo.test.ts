import { expect, it } from "vitest";
import { resumirAuditoria } from "./resumo";

const hoje = new Date("2026-11-08T15:00:00Z");
const r = (quando: string, acao: string, usuarioId: string | null = "u1") => ({ id: 1, quando, usuarioId, acao, tabela: null, titulo: null, aparelho: null });

it("resume hoje e o mês, sem contar o que é de outro mês", () => {
  const x = resumirAuditoria(
    [
      r("2026-11-08T12:00:00Z", "documentos.insert", "u1"),
      r("2026-11-08T13:00:00Z", "sessao.entrada", "u2"),
      r("2026-11-03T13:00:00Z", "login.falha", null),
      r("2026-11-03T13:00:00Z", "descarte.termo"),
      r("2026-11-02T13:00:00Z", "emprestimos.insert"),
      r("2026-10-30T13:00:00Z", "sessao.entrada"),
    ],
    hoje,
  );
  expect(x).toEqual({ hoje: 2, usuariosHoje: 2, descartes: 1, emprestimos: 1, logins: 1, recusadas: 1 });
});
