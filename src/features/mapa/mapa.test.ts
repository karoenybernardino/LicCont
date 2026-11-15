import { describe, expect, it } from "vitest";
import { ESTRUTURA_DEMO } from "@/features/demo/estrutura";
import { DOCUMENTOS_DEMO, idCaixaDemo } from "@/features/demo/documentos";
import { lerCodigo, formatarCodigo } from "./codigo";
import { CORES } from "./cores";
import { calcularLeiaute, centroDaCaixa, enderecoDaInstancia, paraCelulas, tamanhoRua, validarPlanta, vizinha } from "./geometria";
import { galpaoGrande } from "./galpao-grande";
import { faixaMedia, faixaOcupacao } from "./ocupacao";
import { PLANTA_VAZIA, type CaixaCompacta, type Planta } from "./tipos";
import { caminhoDeVolta, lerParametros, urlMapa } from "./url";

const caixasDemo = (): CaixaCompacta[] =>
  ESTRUTURA_DEMO.niveis.flatMap((n) => Array.from({ length: n.caixas }, (_, i) => ({ id: idCaixaDemo(n.id, i + 1), nivelId: n.id, numero: i + 1 })));

describe("leitura do código digitado", () => {
  it.each([
    ["B-M3-N3-C02", { rua: "B", modulo: 3, nivel: 3, caixa: 2 }],
    ["b m3 n3 c2", { rua: "B", modulo: 3, nivel: 3, caixa: 2 }],
    ["  b-m3  ", { rua: "B", modulo: 3, nivel: undefined, caixa: undefined }],
    ["B", { rua: "B", modulo: undefined, nivel: undefined, caixa: undefined }],
    ["AB-M12-N1-C100", { rua: "AB", modulo: 12, nivel: 1, caixa: 100 }],
  ])("%s", (texto, esperado) => {
    expect(lerCodigo(texto)).toEqual(esperado);
  });
  it.each(["", "015/2023", "B-N3", "B-M3-C2", "B-M3-N3-C", "1234", "B-M3-N3-C02-X", "A".repeat(30)])("recusa %j", (texto) => {
    expect(lerCodigo(texto)).toBeNull();
  });
  it("formata com zero à esquerda", () => {
    expect(formatarCodigo({ rua: "B", modulo: 3, nivel: 3, caixa: 2 })).toBe("B-M3-N3-C02");
  });
});

describe("faixas de ocupação", () => {
  it.each([
    [0, 20, 0], [9, 20, 0], [10, 20, 1], [17, 20, 1], [18, 20, 2], [20, 20, 2], [21, 20, 3], [0, 0, 0], [1, 0, 3],
  ])("%i de %i = faixa %i", (d, c, f) => {
    expect(faixaOcupacao(d, c)).toBe(f);
  });
  it("média da planta", () => {
    expect(faixaMedia([{ documentos: 20, capacidade: 20 }, { documentos: 0, capacidade: 20 }])).toBe(1);
  });
});

describe("cores do canvas", () => {
  it("claro e escuro têm as mesmas chaves e quatro faixas", () => {
    expect(Object.keys(CORES.claro)).toEqual(Object.keys(CORES.escuro));
    expect(CORES.claro.ocupacao).toHaveLength(4);
  });
});

describe("URL do mapa", () => {
  const caixa = "de400000-0000-0000-0000-000000000011";
  it("lê só valores válidos", () => {
    const p = lerParametros({ caixa, doc: "x", vista: "planta", codigos: "b-m3-n3-c02,xx,A-M1-N1-C01" });
    expect(p).toMatchObject({ caixa, doc: null, vista: "planta", codigos: ["B-M3-N3-C02", "A-M1-N1-C01"] });
    expect(lerParametros({ vista: "x" }).vista).toBeNull();
    expect(lerParametros({ caixa: ["a", "b"] }).caixa).toBeNull();
  });
  it("limita os destaques a 50", () => {
    const muitos = Array.from({ length: 80 }, (_, i) => `A-M1-N1-C${String(i + 1).padStart(2, "0")}`).join(",");
    expect(lerParametros({ codigos: muitos }).codigos).toHaveLength(50);
  });
  it("monta a URL e o caminho de volta", () => {
    expect(urlMapa({})).toBe("/mapa");
    expect(urlMapa({ caixa, doc: "d", vista: "planta" })).toBe(`/mapa?caixa=${caixa}&doc=d&vista=planta`);
    expect(urlMapa({ caixa, vista: "3d" })).toBe(`/mapa?caixa=${caixa}`);
    expect(caminhoDeVolta("abc")).toBe("/documentos/abc");
    expect(caminhoDeVolta(null)).toBeNull();
  });
  it("?galpao=grande é só uma marca", () => {
    expect(lerParametros({ galpao: "grande" })).toMatchObject({ galpao: null, grande: true });
  });
});

describe("leiaute do galpão fictício", () => {
  const l = calcularLeiaute(ESTRUTURA_DEMO, caixasDemo(), PLANTA_VAZIA);
  it("uma instância por caixa ativa e cada documento fictício tem a sua caixa", () => {
    expect(l.caixas.n).toBe(caixasDemo().length);
    for (const d of DOCUMENTOS_DEMO) expect(l.caixas.porId.has(d.caixa_id)).toBe(true);
  });
  it("sem posição salva as ruas ficam lado a lado, na ordem do código, sem passar da parede", () => {
    expect(l.ruas.map((r) => r.codigo)).toEqual(["A", "B", "C", "D"]);
    expect(l.ruas.every((r) => r.estado === "automatica" && r.problema === null)).toBe(true);
    expect(l.ruas[1].y).toBeGreaterThan(l.ruas[0].y);
  });
  it("o endereço da instância bate com o código", () => {
    const ruaB = ESTRUTURA_DEMO.ruas.find((r) => r.codigo === "B")!;
    const modulo3 = ESTRUTURA_DEMO.modulos.find((m) => m.ruaId === ruaB.id && m.numero === 3)!;
    const nivel3 = ESTRUTURA_DEMO.niveis.find((n) => n.moduloId === modulo3.id && n.numero === 3)!;
    const i = l.caixas.porId.get(idCaixaDemo(nivel3.id, 2))!;
    expect(i).toBeDefined();
    expect(enderecoDaInstancia(l, i)).toEqual({ rua: "B", modulo: 3, nivel: 3, caixa: 2 });
    expect(centroDaCaixa(l, i)).toHaveLength(3);
  });
  it("caixa desativada ou módulo desativado não entra", () => {
    const e = { ...ESTRUTURA_DEMO, modulos: ESTRUTURA_DEMO.modulos.map((m, i) => (i === 0 ? { ...m, ativo: false } : m)) };
    expect(calcularLeiaute(e, caixasDemo(), PLANTA_VAZIA).modulos).toHaveLength(ESTRUTURA_DEMO.modulos.length - 1);
  });
  it("teclado: vizinhas na mesma rua", () => {
    const i = l.caixas.porId.get(idCaixaDemo(ESTRUTURA_DEMO.niveis[5].id, 2))!;
    const dir = vizinha(l, i, "dir");
    expect(dir).toBeGreaterThanOrEqual(0);
    expect(l.caixas.meta[dir * 4 + 3]).toBe(l.caixas.meta[i * 4 + 3] + 1);
    expect(vizinha(l, i, "esq")).toBeGreaterThanOrEqual(0);
  });
});

describe("planta salva", () => {
  const caixas = caixasDemo();
  const [a, b] = ESTRUTURA_DEMO.ruas;
  // 1 m por célula: metros = células, as contas dos testes ficam as mesmas.
  const base: Planta = { ...PLANTA_VAZIA, metrosCelula: 1, largura: 20, profundidade: 12 };
  it("usa as posições salvas e gira", () => {
    const l = calcularLeiaute(ESTRUTURA_DEMO, caixas, { ...base, ruas: { [a.id]: { x: 2, y: 1, giro: 0 }, [b.id]: { x: 12, y: 1, giro: 90 } } });
    const ra = l.ruas.find((r) => r.id === a.id)!;
    const rb = l.ruas.find((r) => r.id === b.id)!;
    expect([ra.x, ra.y, ra.w, ra.h, ra.estado]).toEqual([2, 1, 5, 2, "posicionada"]);
    expect([rb.x, rb.y, rb.w, rb.h]).toEqual([12, 1, 2, 5]);
    expect(l.ruas.filter((r) => r.estado === "automatica")).toHaveLength(2);
    expect(l.largura).toBe(20);
  });
  it("rua fora da parede e rua sobreposta são apontadas", () => {
    const l = calcularLeiaute(ESTRUTURA_DEMO, caixas, { ...base, ruas: { [a.id]: { x: 17, y: 1, giro: 0 }, [b.id]: { x: 18, y: 1, giro: 0 } } });
    expect(l.ruas.find((r) => r.id === a.id)!.problema).toBe("fora");
    expect(l.ruas.find((r) => r.id === b.id)!.problema).toBe("fora");
    const s = calcularLeiaute(ESTRUTURA_DEMO, caixas, { ...base, ruas: { [a.id]: { x: 2, y: 1, giro: 0 }, [b.id]: { x: 4, y: 2, giro: 0 } } });
    expect(s.ruas.find((r) => r.id === b.id)!.problema).toBe("sobreposta");
    expect(s.ruas.find((r) => r.id === b.id)!.sobrepoeCom).toBe("A");
  });
  it("a validação do servidor é a mesma", () => {
    const ruas = [
      { id: "1", codigo: "A", modulos: 5, x: 0, y: 0, giro: 0 as const },
      { id: "2", codigo: "B", modulos: 5, x: 0, y: 2, giro: 0 as const },
      { id: "3", codigo: "C", modulos: 5, x: 16, y: 0, giro: 0 as const },
      { id: "4", codigo: "D", modulos: 5, x: null, y: null, giro: 0 as const },
    ];
    expect(validarPlanta({ largura: 20, profundidade: 12, ruas })).toEqual([{ ruaId: "3", tipo: "fora", com: null }]);
    expect(validarPlanta({ largura: 20, profundidade: 12, ruas: [ruas[0], { ...ruas[1], y: 1 }] })).toEqual([
      { ruaId: "1", tipo: "sobreposta", com: "B" },
      { ruaId: "2", tipo: "sobreposta", com: "A" },
    ]);
    expect(tamanhoRua(7, 90)).toEqual({ w: 2, h: 7 });
  });
  it("rua de um lado só tem 1 célula de fundo, em qualquer giro", () => {
    expect(tamanhoRua(7, 0, 1)).toEqual({ w: 7, h: 1 });
    expect(tamanhoRua(7, 90, 1)).toEqual({ w: 1, h: 7 });
    expect(tamanhoRua(7, 180)).toEqual({ w: 7, h: 2 });
  });
  it("rua de um lado só põe as caixas numa fileira só, dentro do retângulo", () => {
    for (const giro of [0, 90, 180, 270] as const) {
      const l = calcularLeiaute(ESTRUTURA_DEMO, caixas, { ...base, ruas: { [a.id]: { x: 5, y: 4, giro, lados: 1 } } });
      const r = l.ruas.find((x) => x.id === a.id)!;
      expect(r.lados).toBe(1);
      expect(Math.min(r.w, r.h)).toBe(1);
      const mods = l.modulos.filter((m) => m.ruaId === a.id);
      expect(mods.every((m) => Math.min(m.w, m.h) === 1)).toBe(true);
      for (let i = 0; i < l.caixas.n; i++) {
        if (l.caixas.meta[i * 4] !== l.ruas.findIndex((x) => x.id === a.id)) continue;
        const cx = l.caixas.centro[i * 3] / 2;
        const cz = l.caixas.centro[i * 3 + 2] / 2;
        expect(cx).toBeGreaterThanOrEqual(r.x);
        expect(cx).toBeLessThanOrEqual(r.x + r.w);
        expect(cz).toBeGreaterThanOrEqual(r.y);
        expect(cz).toBeLessThanOrEqual(r.y + r.h);
      }
    }
  });
  it("a mesma caixa fica dentro do retângulo da rua em qualquer giro", () => {
    for (const giro of [0, 90, 180, 270] as const) {
      const l = calcularLeiaute(ESTRUTURA_DEMO, caixas, { ...base, ruas: { [a.id]: { x: 5, y: 4, giro } } });
      const r = l.ruas.find((x) => x.id === a.id)!;
      for (let i = 0; i < l.caixas.n; i++) {
        if (l.caixas.meta[i * 4] !== 0) continue;
        const cx = l.caixas.centro[i * 3] / 2;
        const cz = l.caixas.centro[i * 3 + 2] / 2;
        expect(cx).toBeGreaterThanOrEqual(r.x);
        expect(cx).toBeLessThanOrEqual(r.x + r.w);
        expect(cz).toBeGreaterThanOrEqual(r.y);
        expect(cz).toBeLessThanOrEqual(r.y + r.h);
      }
    }
  });
});

describe("galpão grande (15.360 caixas)", () => {
  const { estrutura, caixas } = galpaoGrande();
  it("tem 15.360 caixas", () => {
    expect(caixas).toHaveLength(15360);
  });
  it("o leiaute sai em menos de 150 ms", () => {
    calcularLeiaute(estrutura, caixas, PLANTA_VAZIA); // aquece o JIT, como no navegador
    const t = performance.now();
    const l = calcularLeiaute(estrutura, caixas, PLANTA_VAZIA);
    const ms = performance.now() - t;
    expect(l.caixas.n).toBe(15360);
    expect(ms).toBeLessThan(150);
  });
});

describe("demonstração", () => {
  it("a caixa do canvas (B-M3-N3-C02) tem 14 documentos", () => {
    const ruaB = ESTRUTURA_DEMO.ruas.find((r) => r.codigo === "B")!;
    const m3 = ESTRUTURA_DEMO.modulos.find((m) => m.ruaId === ruaB.id && m.numero === 3)!;
    const n3 = ESTRUTURA_DEMO.niveis.find((n) => n.moduloId === m3.id && n.numero === 3)!;
    expect(DOCUMENTOS_DEMO.filter((d) => d.caixa_id === idCaixaDemo(n3.id, 2))).toHaveLength(14);
  });
});

describe("planta em metros", () => {
  const caixas = caixasDemo();
  const [a] = ESTRUTURA_DEMO.ruas;
  it("converte metros em células pelo módulo (padrão 1,20 m)", () => {
    const c = paraCelulas({ ...PLANTA_VAZIA, largura: 14.4, profundidade: 12, entradaPosicao: 2.4, ruas: { x: { x: 3.6, y: 1.2, giro: 90 } }, elementos: [{ id: "e", tipo: "pilar", rotulo: null, x: 6, y: 1.2, largura: 0.6, profundidade: 2.4, giro: 0 }] });
    expect([c.largura, c.profundidade, c.entradaPosicao, c.metrosCelula]).toEqual([12, 10, 2, 1.2]);
    expect([c.ruas.x.x, c.ruas.x.y]).toEqual([3, 1]);
    expect(c.elementos[0]).toMatchObject({ x: 5, y: 1, largura: 0.5, profundidade: 2 });
  });
  it("o leiaute continua em células e guarda os metros", () => {
    const l = calcularLeiaute(ESTRUTURA_DEMO, caixas, { ...PLANTA_VAZIA, metrosCelula: 1.2, largura: 24, profundidade: 14.4, ruas: { [a.id]: { x: 2.4, y: 1.2, giro: 0 } } });
    const r = l.ruas.find((x) => x.id === a.id)!;
    expect([l.largura, l.profundidade, l.metros]).toEqual([20, 12, 1.2]);
    expect([r.x, r.y, r.w, r.h, r.problema]).toEqual([2, 1, 5, 2, null]);
  });
  it("posição que não cai na grade de células também vale", () => {
    const l = calcularLeiaute(ESTRUTURA_DEMO, caixas, { ...PLANTA_VAZIA, metrosCelula: 1.2, largura: 24, profundidade: 14.4, ruas: { [a.id]: { x: 1.8, y: 0.6, giro: 0 } } });
    const r = l.ruas.find((x) => x.id === a.id)!;
    expect([r.x, r.y]).toEqual([1.5, 0.5]);
    expect(r.problema).toBeNull();
  });
  it("a validação do servidor usa metros: tamanho da rua = módulos x metros", () => {
    const ruas = [
      { id: "1", codigo: "A", modulos: 5, x: 0, y: 0, giro: 0 as const },
      { id: "2", codigo: "B", modulos: 5, x: 18, y: 0, giro: 0 as const },
    ];
    // 5 módulos de 1,2 m = 6 m: a rua B vai até 24 m, o galpão tem 22,8 m.
    expect(validarPlanta({ largura: 22.8, profundidade: 12, metros: 1.2, ruas })).toEqual([{ ruaId: "2", tipo: "fora", com: null }]);
    expect(validarPlanta({ largura: 24, profundidade: 12, metros: 1.2, ruas })).toEqual([]);
    // encostada (6 m = fim da rua A) não sobrepõe; entrar 1,2 m na rua A sobrepõe
    expect(validarPlanta({ largura: 24, profundidade: 12, metros: 1.2, ruas: [ruas[0], { ...ruas[1], x: 6, y: 1.2 }] })).toEqual([]);
    expect(validarPlanta({ largura: 24, profundidade: 12, metros: 1.2, ruas: [ruas[0], { ...ruas[1], x: 4.8, y: 1.2 }] })).toHaveLength(2);
  });
});

describe("medidas em metros", () => {
  it("formata com vírgula e no máximo duas casas", async () => {
    const { formatarMetros } = await import("./tipos");
    expect(formatarMetros(16.8)).toBe("16,8 m");
    expect(formatarMetros(7.2)).toBe("7,2 m");
    expect(formatarMetros(28)).toBe("28 m");
    expect(formatarMetros(1.2345)).toBe("1,23 m");
  });
});
