import { expect, it } from "vitest";
import { esquemaCaixas, esquemaModulos, esquemaSituacao, mensagemErro } from "./esquemas";

const id = "de300000-0000-0000-0000-000000000001";

it("adicionar módulos respeita os limites do banco", () => {
  expect(esquemaModulos.safeParse({ rua: id, modulos: "2", niveis: "4", capacidade: "3" }).success).toBe(true);
  expect(esquemaModulos.safeParse({ rua: id, modulos: "21", niveis: "4", capacidade: "3" }).success).toBe(false);
  expect(esquemaModulos.safeParse({ rua: id, modulos: "2", niveis: "11", capacidade: "3" }).success).toBe(false);
  expect(esquemaModulos.safeParse({ rua: id, modulos: "2", niveis: "4", capacidade: "51" }).success).toBe(false);
  expect(esquemaModulos.safeParse({ rua: "x", modulos: "2", niveis: "4", capacidade: "3" }).success).toBe(false);
});

it("caixas e situação só aceitam valores conhecidos", () => {
  expect(esquemaCaixas.safeParse({ nivel: id, quantidade: "0" }).success).toBe(false);
  expect(esquemaSituacao.safeParse({ tabela: "usuarios", id, ativo: "sim" }).success).toBe(false);
  expect(esquemaSituacao.parse({ tabela: "caixas", id, ativo: "nao" }).ativo).toBe(false);
});

it("erros do banco viram mensagem em português", () => {
  expect(mensagemErro("LC001")).toMatch(/posição livre/);
  expect(mensagemErro("XX000")).toBe("Não foi possível salvar.");
});
