import { describe, expect, it } from "vitest";
import { rotaOculta } from "./ocultos";

describe("rotaOculta", () => {
  it("bloqueia relatórios, TCE e PNCP", () => {
    for (const r of ["/relatorios", "/relatorios/baixar", "/importados", "/importados/1/pncp", "/configuracoes/tce", "/api/tce/importar", "/equipe/integracoes"]) expect(rotaOculta(r)).toBe(true);
  });
  it("mantém a importação de acervo e o resto", () => {
    for (const r of ["/cadastro/importar", "/importados-x", "/pesquisa", "/etiquetas", "/configuracoes"]) expect(rotaOculta(r)).toBe(false);
  });
});
