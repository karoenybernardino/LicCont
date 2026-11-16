import { describe, expect, it } from "vitest";
import type { ErrorEvent } from "@sentry/nextjs";
import { limparEvento, limparTexto, opcoesSentry, semConsulta } from "./limpar";

describe("alerta de erro sem dado pessoal", () => {
  it("mascara CPF, e-mail e a linha que o banco devolve", () => {
    const t = limparTexto(
      'CPF 123.456.789-09 e 12345678909 · fulana@exemplo.test · Failing row contains (Maria Fictícia, texto do documento) · Key (email)=(x@y.test) already exists',
    );
    expect(t).not.toMatch(/123\.456|12345678909|fulana|Maria|texto do documento|x@y/);
    expect(t).toContain("[cpf]");
    expect(t).toContain("[e-mail]");
    expect(t).toContain("Failing row contains [dados removidos]");
  });

  it("tira pessoa, requisição, rastros, variáveis e a consulta da URL", () => {
    const e = limparEvento({
      type: undefined,
      user: { email: "a@b.test", ip_address: "1.2.3.4" },
      extra: { corpo: "segredo" },
      breadcrumbs: [{ message: "busca" }],
      server_name: "maquina",
      request: { url: "https://app.test/pesquisa?busca=texto%20do%20documento", method: "GET", cookies: { a: "b" }, headers: { cookie: "x" }, data: "corpo" },
      transaction: "/pesquisa?busca=x",
      contexts: { os: { name: "Linux" }, nextjs: { request_path: "/pesquisa?busca=x" } },
      exception: { values: [{ type: "Error", value: "CPF 123.456.789-09", stacktrace: { frames: [{ filename: "a.ts", vars: { cpf: "123" } }] } }] },
    } as ErrorEvent);
    expect(e.user).toBeUndefined();
    expect(e.extra).toBeUndefined();
    expect(e.breadcrumbs).toBeUndefined();
    expect(e.server_name).toBeUndefined();
    expect(e.request).toEqual({ url: "https://app.test/pesquisa", method: "GET" });
    expect(e.transaction).toBe("/pesquisa");
    expect(Object.keys(e.contexts ?? {})).toEqual(["os"]);
    expect(e.exception?.values?.[0].value).toBe("CPF [cpf]");
    expect(e.exception?.values?.[0].stacktrace?.frames?.[0].vars).toBeUndefined();
  });

  it("sem DSN fica desligado e nunca manda dado de quem usa", () => {
    const o = opcoesSentry(undefined, undefined);
    expect(o.enabled).toBe(false);
    expect(o.sendDefaultPii).toBe(false);
    expect(o.tracesSampleRate).toBe(0);
    expect(o.beforeBreadcrumb()).toBeNull();
    expect(semConsulta("/a?b#c")).toBe("/a");
  });
});
