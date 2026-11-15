import { describe, expect, it } from "vitest";
import { categoriaDe, classificar, origemDe } from "./classificar";

describe("auditoria", () => {
  it("classifica a ação gravada", () => {
    expect(classificar("documentos.insert")).toEqual({ rotulo: "Cadastro", tom: "ok" });
    expect(classificar("secretarias.update")).toEqual({ rotulo: "Edição", tom: "aviso" });
    expect(classificar("sessao.entrada")).toEqual({ rotulo: "Login", tom: "neutro" });
    expect(classificar("login.falha")).toEqual({ rotulo: "Login", tom: "neutro" });
    expect(classificar("arquivos.ver")).toEqual({ rotulo: "Visualização", tom: "neutro" });
    expect(classificar("descarte.termo")).toEqual({ rotulo: "Descarte", tom: "erro" });
    expect(classificar("emprestimos.insert")).toEqual({ rotulo: "Empréstimo", tom: "aviso" });
    expect(classificar("emprestimos.retirada")).toEqual({ rotulo: "Empréstimo", tom: "aviso" });
    expect(classificar("emprestimos.devolucao")).toEqual({ rotulo: "Devolução", tom: "ok" });
  });
  it("categoria do filtro", () => {
    expect(categoriaDe("emprestimos.update")).toBe("emprestimos");
    expect(categoriaDe("documentos.insert")).toBe("cadastro");
    expect(categoriaDe("descarte.termo")).toBe("descarte");
    expect(categoriaDe("sessao.entrada")).toBe("outras");
  });
  it("origem pelo aparelho, sem guardar o texto", () => {
    expect(origemDe("Mozilla/5.0 (iPhone; CPU) Mobile")).toBe("Celular");
    expect(origemDe("Mozilla/5.0 (Windows NT 10.0)")).toBe("Desktop");
    expect(origemDe(null)).toBe("–");
  });
});
