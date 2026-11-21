import { describe, expect, it } from "vitest";
import { capacidadeTotal, emAlerta, montarCapacidade, niveisPorModulo, numeroNoModulo, percentualOcupacao, textoCaixaNoModulo, textoCaixasLivres } from "./capacidade";

describe("capacidade do arquivo", () => {
  it("módulos x caixas por módulo", () => {
    expect(capacidadeTotal(40, 36)).toBe(1440);
    expect(capacidadeTotal(40, 30)).toBe(1200);
    expect(niveisPorModulo(30)).toBe(5);
    expect(niveisPorModulo(36)).toBe(6);
  });
  it("percentual sem dividir por zero e alerta acima de 90%", () => {
    expect(percentualOcupacao(0, 0)).toBe(0);
    expect(percentualOcupacao(1, 3)).toBe(33);
    expect(emAlerta(90)).toBe(false);
    expect(emAlerta(91)).toBe(true);
    expect(emAlerta(75, 70)).toBe(true);
  });
  it("conta a caixa dentro do módulo", () => {
    expect(numeroNoModulo(3, 5)).toBe(17);
    expect(textoCaixaNoModulo(3, 5, 36)).toBe("Caixa 17 de 36");
    expect(textoCaixasLivres(1)).toBe("1 caixa livre");
    expect(textoCaixasLivres(4)).toBe("4 caixas livres");
  });
  it("agrega por rua, módulo e nível", () => {
    const c = montarCapacidade({
      caixas_por_modulo: 30,
      por_modulo: [{ rua: "A", modulo: 1, ocupadas: 30 }, { rua: "A", modulo: 2, ocupadas: 15 }, { rua: "B", modulo: 1, ocupadas: 0 }],
      por_nivel: [{ nivel: 2, ocupadas: 20 }, { nivel: 1, ocupadas: 25 }],
    });
    expect(c.total).toBe(90);
    expect(c.ocupadas).toBe(45);
    expect(c.percentual).toBe(50);
    expect(c.livres).toBe(45);
    expect(c.alerta).toBe(false);
    expect(c.porRua).toEqual([{ rotulo: "Rua A", ocupadas: 45, total: 60, percentual: 75 }, { rotulo: "Rua B", ocupadas: 0, total: 30, percentual: 0 }]);
    expect(c.porModulo[0]).toMatchObject({ rotulo: "A-M1", percentual: 100 });
    expect(c.porNivel.map((n) => n.rotulo)).toEqual(["Nível 1", "Nível 2"]);
    expect(c.porNivel[0].total).toBe(18);
  });
});
