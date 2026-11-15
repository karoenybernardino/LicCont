import { describe, expect, it } from "vitest";
import { esquemaDevolucao, esquemaEmprestimo, hojeBrasilia } from "./esquemas";

const ID = "d0a10000-0000-0000-0000-000000000000";
const soma = (n: number) => new Date(Date.parse(`${hojeBrasilia()}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
const base = { documento: ID, nome: "Pessoa Fictícia", setor: "Setor Fictício", retirada: soma(0), prazo: soma(10) };

describe("esquemaEmprestimo", () => {
  it("aceita um empréstimo válido e apara os textos", () => {
    const r = esquemaEmprestimo.safeParse({ ...base, nome: "  Pessoa Fictícia  " });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.nome).toBe("Pessoa Fictícia");
  });
  it("aceita prazo de até 60 dias e recusa 61", () => {
    expect(esquemaEmprestimo.safeParse({ ...base, prazo: soma(60) }).success).toBe(true);
    expect(esquemaEmprestimo.safeParse({ ...base, prazo: soma(61) }).success).toBe(false);
  });
  it("recusa prazo antes da retirada", () => {
    expect(esquemaEmprestimo.safeParse({ ...base, retirada: soma(-3), prazo: soma(-4) }).success).toBe(false);
  });
  it("recusa retirada no futuro", () => {
    expect(esquemaEmprestimo.safeParse({ ...base, retirada: soma(2), prazo: soma(5) }).success).toBe(false);
  });
  it("aceita retirada no passado", () => {
    expect(esquemaEmprestimo.safeParse({ ...base, retirada: soma(-5), prazo: soma(5) }).success).toBe(true);
  });
  it("recusa campos vazios, data inválida e documento que não é id", () => {
    expect(esquemaEmprestimo.safeParse({ ...base, nome: "  " }).success).toBe(false);
    expect(esquemaEmprestimo.safeParse({ ...base, setor: "" }).success).toBe(false);
    expect(esquemaEmprestimo.safeParse({ ...base, prazo: "2026-13-45" }).success).toBe(false);
    expect(esquemaEmprestimo.safeParse({ ...base, documento: "x" }).success).toBe(false);
  });
  it("limita a observação a 500 caracteres", () => {
    expect(esquemaEmprestimo.safeParse({ ...base, observacao: "a".repeat(501) }).success).toBe(false);
  });
});

describe("esquemaDevolucao", () => {
  it("só aceita id", () => {
    expect(esquemaDevolucao.safeParse({ id: ID }).success).toBe(true);
    expect(esquemaDevolucao.safeParse({ id: "1" }).success).toBe(false);
  });
});
