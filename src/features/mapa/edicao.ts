// Contas do editor da planta ao estilo Revit (plano: docs/fases/mapa-editor-revit.md).
// Sem React: serve ao editor e aos testes. Tudo em METROS; as células só
// servem para "agarrar" (snap) na grade.
import { arredondar, type ElementoPlanta, type LadoEntrada } from "./tipos";

const preso = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
/** Agarra na grade: múltiplo de `m` mais próximo. */
export const naGrade = (v: number, m: number) => arredondar(Math.round(v / m) * m);

/** Entrada do galpão: arrastar o traço laranja para qualquer parede. Devolve lado e posição (m). */
export function entradaPorPonto(x: number, y: number, largura: number, profundidade: number, larguraEntrada: number, m: number): { lado: LadoEntrada; posicao: number } {
  const dist: [LadoEntrada, number][] = [["esquerda", x], ["direita", largura - x], ["fundo", y], ["frente", profundidade - y]];
  const lado = dist.reduce((a, b) => (b[1] < a[1] ? b : a))[0];
  const horizontal = lado === "frente" || lado === "fundo";
  const ao = horizontal ? x : y;
  const total = horizontal ? largura : profundidade;
  return { lado, posicao: preso(naGrade(ao - larguraEntrada / 2, m), 0, Math.max(0, arredondar(total - larguraEntrada))) };
}

/** Parede desenhada de A até B (como a ferramenta Parede do Revit): reta, na grade, de uma célula de espessura. */
export function paredeDesenhada(a: { x: number; y: number }, b: { x: number; y: number }, m: number): Pick<ElementoPlanta, "x" | "y" | "largura" | "profundidade"> {
  const ax = naGrade(a.x, m), ay = naGrade(a.y, m), bx = naGrade(b.x, m), by = naGrade(b.y, m);
  const dx = Math.abs(bx - ax), dy = Math.abs(by - ay);
  if (dx >= dy) return { x: Math.min(ax, bx), y: ay, largura: Math.max(m, dx), profundidade: m };
  return { x: ax, y: Math.min(ay, by), largura: m, profundidade: Math.max(m, dy) };
}

/** Porta e janela entram na parede externa mais próxima (a até 1,5 célula dela); fora disso, null. */
export function encaixarNaParede(
  ponto: { x: number; y: number },
  largura: number,
  profundidade: number,
  m: number,
): Pick<ElementoPlanta, "x" | "y" | "largura" | "profundidade"> | null {
  const comp = 2 * m; // comprimento da folha ou do vão
  const esp = m;
  const dist = [["esq", ponto.x], ["dir", largura - ponto.x], ["topo", ponto.y], ["base", profundidade - ponto.y]] as const;
  const [lado, d] = dist.reduce((a, b) => (b[1] < a[1] ? b : a));
  if (d > 1.5 * m || d < -1e-6) return null;
  if (lado === "topo" || lado === "base") {
    const x = preso(naGrade(ponto.x - comp / 2, m), 0, Math.max(0, arredondar(largura - comp)));
    return { x, y: lado === "topo" ? 0 : arredondar(profundidade - esp), largura: comp, profundidade: esp };
  }
  const y = preso(naGrade(ponto.y - comp / 2, m), 0, Math.max(0, arredondar(profundidade - comp)));
  return { x: lado === "esq" ? 0 : arredondar(largura - esp), y, largura: esp, profundidade: comp };
}

/** Arrastar a ponta de uma rua: quantos módulos entram (+) ou saem (−). A rua nunca fica com menos de 1. */
export function modulosDoArrasto(arrasteM: number, m: number, modulosAtuais: number): number {
  return Math.max(1 - modulosAtuais, Math.round(arrasteM / m));
}
