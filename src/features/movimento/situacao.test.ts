import { describe, expect, it } from "vitest";
import { prazoGuarda, situacaoEmprestimo } from "./situacao";

const hoje = new Date("2026-11-08T15:00:00Z");

describe("situação", () => {
  it("empréstimo atrasado, a vencer e no prazo", () => {
    expect(situacaoEmprestimo("2026-10-29", hoje)).toEqual({ tom: "erro", texto: "10 dias de atraso", atrasado: true });
    expect(situacaoEmprestimo("2026-11-07", hoje)).toEqual({ tom: "erro", texto: "1 dia de atraso", atrasado: true });
    expect(situacaoEmprestimo("2026-11-12", hoje)).toEqual({ tom: "aviso", texto: "Vence em 4 dias", atrasado: false });
    expect(situacaoEmprestimo("2026-11-08", hoje).texto).toBe("Vence hoje");
    expect(situacaoEmprestimo("2026-11-20", hoje)).toEqual({ tom: "ok", texto: "No prazo", atrasado: false });
  });
  it("prazo de guarda", () => {
    expect(prazoGuarda(18)).toEqual({ aviso: true, texto: "em 18 dias" });
    expect(prazoGuarda(73)).toEqual({ aviso: false, texto: "em 73 dias" });
  });
});
