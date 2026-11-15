import { describe, expect, it } from "vitest";
import { lerPedido } from "./pedido";

const fd = (o: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.set(k, v);
  return f;
};
const ok = { nome: "Pessoa Fictícia", orgao: "Prefeitura Fictícia", email: "pessoa@exemplo.test" };

describe("lerPedido", () => {
  it("aceita o mínimo e preenche o resto vazio", () => {
    const r = lerPedido(fd(ok));
    expect(r.success).toBe(true);
    expect(r.data).toMatchObject({ cargo: "", telefone: "", mensagem: "" });
  });
  it("recusa e-mail inválido, nome curto e campo-isca preenchido", () => {
    expect(lerPedido(fd({ ...ok, email: "sem-arroba" })).success).toBe(false);
    expect(lerPedido(fd({ ...ok, nome: "A" })).success).toBe(false);
    expect(lerPedido(fd({ ...ok, empresa_site: "robo" })).success).toBe(false);
  });
  it("recusa mensagem acima de 1000 caracteres", () => {
    expect(lerPedido(fd({ ...ok, mensagem: "x".repeat(1001) })).success).toBe(false);
  });
});
