import { describe, expect, it } from "vitest";
import { esquemaLogin, esquemaNovaSenha } from "./esquemas";

describe("esquemaLogin", () => {
  const valido = {
    secretaria: "5eed0000-0000-0000-0000-000000000001",
    email: "pessoa@exemplo.test",
    senha: "x",
  };

  it("aceita secretaria por id ou 'todas'", () => {
    expect(esquemaLogin.safeParse(valido).success).toBe(true);
    expect(esquemaLogin.safeParse({ ...valido, secretaria: "todas" }).success).toBe(true);
  });

  it("recusa secretaria, e-mail ou senha inválidos", () => {
    expect(esquemaLogin.safeParse({ ...valido, secretaria: "saude" }).success).toBe(false);
    expect(esquemaLogin.safeParse({ ...valido, email: "nao-e-email" }).success).toBe(false);
    expect(esquemaLogin.safeParse({ ...valido, senha: "" }).success).toBe(false);
  });
});

describe("esquemaNovaSenha", () => {
  it("exige 12 caracteres e confirmação igual", () => {
    expect(esquemaNovaSenha.safeParse({ senha: "curta", confirmacao: "curta" }).success).toBe(false);
    expect(
      esquemaNovaSenha.safeParse({ senha: "uma-senha-longa", confirmacao: "outra-senha-longa" }).success,
    ).toBe(false);
    expect(
      esquemaNovaSenha.safeParse({ senha: "uma-senha-longa", confirmacao: "uma-senha-longa" }).success,
    ).toBe(true);
  });
});
