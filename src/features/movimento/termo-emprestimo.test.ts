import { describe, expect, it } from "vitest";
import { gerarPdf } from "@/features/temporalidade/pdf";
import { gerarWord } from "@/features/temporalidade/word";
import { esquemaDecisao } from "./esquemas";
import { conteudoTermoEmprestimo } from "./termo-emprestimo";

const base = {
  prefeitura: "Prefeitura Fictícia", secretaria: "Saúde", titulo: "Contrato 019/2015", objeto: "Locação de veículos", caixa: "D-M1-N1-C05",
  quem: "Pessoa Fictícia", setor: "Setor Fictício", retirada: "2026-11-01", prazo: "2026-11-16", devolvidoEm: null, observacao: null,
};

describe("termo de empréstimo", () => {
  it("emprestado: pede devolução até o prazo", () => {
    const c = conteudoTermoEmprestimo(base);
    expect(c.titulo).toBe("TERMO DE EMPRÉSTIMO DE DOCUMENTO");
    expect(c.paragrafos.join(" ")).toMatch(/devolvido até 16\/11\/2026/);
    expect(c.assinaturas).toEqual(["Quem retira o documento", "Responsável pelo arquivo"]);
  });
  it("devolvido: registra a data e usa o modelo editado", () => {
    const c = conteudoTermoEmprestimo({ ...base, devolvidoEm: "2026-11-10T12:00:00Z" }, { baseLegal: "Texto da prefeitura.", assinaturas: "Chefe" });
    expect(c.paragrafos[0]).toBe("Texto da prefeitura.");
    expect(c.paragrafos.join(" ")).toMatch(/devolvido em 10\/11\/2026/);
    expect(c.rodape).toBe("Situação: devolvido.");
  });
  it("não leva CPF e gera PDF e Word", async () => {
    const c = conteudoTermoEmprestimo(base);
    expect(JSON.stringify(c)).not.toMatch(/\d{3}\.\d{3}\.\d{3}-\d{2}/);
    expect((await gerarPdf(c)).length).toBeGreaterThan(500);
    expect((await gerarWord(c)).length).toBeGreaterThan(500);
  });
});

describe("esquemaDecisao", () => {
  it("só aprovar ou recusar, com id válido", () => {
    const id = "de600000-0000-0000-0000-000000000001";
    expect(esquemaDecisao.safeParse({ id, acao: "aprovar" }).success).toBe(true);
    expect(esquemaDecisao.safeParse({ id, acao: "apagar" }).success).toBe(false);
    expect(esquemaDecisao.safeParse({ id: "x", acao: "recusar" }).success).toBe(false);
  });
});
