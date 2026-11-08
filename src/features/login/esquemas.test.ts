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
  it("exige 8 caracteres com os 4 tipos e confirmação igual", () => {
    const ok = (senha: string, confirmacao = senha) => esquemaNovaSenha.safeParse({ senha, confirmacao }).success;
    expect(ok("Ab1!")).toBe(false);
    expect(ok("abcdef1!")).toBe(false);
    expect(ok("ABCDEF1!")).toBe(false);
    expect(ok("Abcdefg!")).toBe(false);
    expect(ok("Abcdefg1")).toBe(false);
    expect(ok("Abcdef1!", "Abcdef1?")).toBe(false);
    expect(ok("Abcdef1é")).toBe(false);
    expect(ok("Abcdef1 ")).toBe(false);
    expect(ok("Abcdef1!")).toBe(true);
  });
});
