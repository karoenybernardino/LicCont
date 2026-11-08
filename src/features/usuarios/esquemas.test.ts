import { describe, expect, it } from "vitest";
import { lerUsuario, senhaProvisoria } from "./esquemas";

function dados(campos: Record<string, string | string[]>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(campos)) for (const item of [v].flat()) fd.append(k, item);
  return fd;
}

describe("lerUsuario", () => {
  const secretaria = "5eed0000-0000-0000-0000-000000000001";

  it("exige secretaria para quem não é administrador", () => {
    expect(lerUsuario(dados({ nome: "Pessoa", perfil: "operador" })).success).toBe(false);
    expect(lerUsuario(dados({ nome: "Pessoa", perfil: "operador", secretarias: [secretaria] })).success).toBe(true);
    expect(lerUsuario(dados({ nome: "Pessoa", perfil: "administrador" })).success).toBe(true);
  });

  it("recusa perfil desconhecido e matrícula vazia vira nulo", () => {
    expect(lerUsuario(dados({ nome: "Pessoa", perfil: "dono" })).success).toBe(false);
    const ok = lerUsuario(dados({ nome: " Pessoa ", perfil: "administrador", matricula: " " }));
    expect(ok.success && ok.data).toMatchObject({ nome: "Pessoa", matricula: null });
  });
});

it("senha provisória tem 16 caracteres, os 4 tipos e muda a cada vez", () => {
  for (let i = 0; i < 50; i++) {
    const s = senhaProvisoria();
    expect(s).toHaveLength(16);
    expect(s).toMatch(/[a-z]/);
    expect(s).toMatch(/[A-Z]/);
    expect(s).toMatch(/\d/);
    expect(s).toMatch(/[^A-Za-z0-9]/);
  }
  expect(senhaProvisoria()).not.toBe(senhaProvisoria());
});
