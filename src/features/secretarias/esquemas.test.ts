import { describe, expect, it } from "vitest";
import { lerSecretaria, PRAZOS_EMPRESTIMO } from "./esquemas";

function dados(campos: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(campos)) fd.append(k, v);
  return fd;
}
const uuid = "5eed0000-0000-4000-8000-000000000001";

describe("lerSecretaria", () => {
  it("só o nome é obrigatório; vazios viram nulo e os padrões valem", () => {
    const r = lerSecretaria(dados({ nome: " Saúde " }));
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data).toMatchObject({ nome: "Saúde", sigla: null, telefone: null, email_contato: null, responsavel_id: null,
        cargo_responsavel: null, rua_preferencial_id: null, recebe_licitacoes: false, prazo_emprestimo_dias: 15, ativa: true });
    }
  });

  it("sigla vai para maiúsculas e recusa símbolos", () => {
    const ok = lerSecretaria(dados({ nome: "Saúde", sigla: "sesau" }));
    expect(ok.success && ok.data.sigla).toBe("SESAU");
    expect(lerSecretaria(dados({ nome: "Saúde", sigla: "S!" })).success).toBe(false);
    expect(lerSecretaria(dados({ nome: "Saúde", sigla: "A".repeat(13) })).success).toBe(false);
  });

  it("confere e-mail, prazo, situação e ids", () => {
    expect(lerSecretaria(dados({ nome: "Saúde", email_contato: "sem-arroba" })).success).toBe(false);
    expect(lerSecretaria(dados({ nome: "Saúde", prazo_emprestimo_dias: "3" })).success).toBe(false);
    for (const p of PRAZOS_EMPRESTIMO) expect(lerSecretaria(dados({ nome: "Saúde", prazo_emprestimo_dias: String(p) })).success).toBe(true);
    expect(lerSecretaria(dados({ nome: "Saúde", responsavel_id: "x" })).success).toBe(false);
    expect(lerSecretaria(dados({ nome: "Saúde", responsavel_id: uuid, rua_preferencial_id: uuid })).success).toBe(true);
    expect(lerSecretaria(dados({ nome: "Saúde", ativa: "nao" }))).toMatchObject({ data: { ativa: false } });
    expect(lerSecretaria(dados({ nome: "S" })).success).toBe(false);
  });

  it("caixas marcadas viram verdadeiro", () => {
    const r = lerSecretaria(dados({ nome: "Saúde", recebe_licitacoes: "on", avisar_atrasos: "on" }));
    expect(r.success && [r.data.recebe_licitacoes, r.data.recebe_contratos, r.data.avisar_atrasos]).toEqual([true, false, true]);
  });
});
