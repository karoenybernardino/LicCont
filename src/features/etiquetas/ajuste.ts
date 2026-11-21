// Ajuste da lista de itens da etiqueta detalhada (puro, sem pdf-lib: a tela e o PDF usam o mesmo cálculo).
// Nada é cortado: o layout reduz a fonte até o mínimo, abre mais colunas e, só se ainda não couber, vira partes.
export const AREA_ITENS = { largura: 474, altura: 212 }; // px do cartão (EtqPapelCaixa)
export const TAM_MIN = 9;
export const TAM_MAX = 15;

// Largura estimada em Helvetica negrito (em em). Margem de segurança: letras valem 0,66.
export function larguraEstimada(t: string, tam: number): number {
  let em = 0;
  for (const c of t) em += /\d/.test(c) ? 0.556 : c === "/" || c === "-" || c === "." ? 0.3 : c === " " ? 0.28 : 0.66;
  return em * tam;
}

type ItemLista = { modalidade: string; numeroAno: string };

// Só o número do processo (015/2026); se houver mais de uma modalidade, a modalidade vai junto para não confundir.
export function rotulosDosItens(itens: ItemLista[]): string[] {
  const misto = new Set(itens.map((i) => i.modalidade)).size > 1;
  return itens.map((i) => (misto ? `${i.modalidade} ${i.numeroAno}` : i.numeroAno));
}

export type Ajuste = { tam: number; colunas: number; linhas: number; capacidade: number; cabe: boolean };

export function ajustarRotulos(rotulos: string[], area = AREA_ITENS): Ajuste {
  const maior = (tam: number) => Math.max(0, ...rotulos.map((r) => larguraEstimada(r, tam))) + tam * 0.9;
  let a: Ajuste = { tam: TAM_MIN, colunas: 1, linhas: 1, capacidade: 1, cabe: false };
  for (let tam = TAM_MAX; tam >= TAM_MIN; tam -= 0.5) {
    const colunas = Math.max(1, Math.floor(area.largura / maior(tam)));
    const linhas = Math.max(1, Math.floor(area.altura / (tam * 1.22)));
    a = { tam, colunas, linhas, capacidade: colunas * linhas, cabe: colunas * linhas >= rotulos.length };
    if (a.cabe) return a;
  }
  return a; // no mínimo: a capacidade diz de quanto em quanto dividir
}

// Quebra a lista em partes. Sem `dividir`: enche cada parte na fonte mínima (só divide se for preciso).
// Com `dividir`: partes de tamanho parecido, o que deixa a fonte maior em cada uma.
export function dividirItens<T extends ItemLista>(itens: T[], dividir: boolean): T[][] {
  const a = ajustarRotulos(rotulosDosItens(itens));
  if (a.cabe) return [itens];
  const n = Math.ceil(itens.length / a.capacidade);
  const tamanho = dividir ? Math.ceil(itens.length / n) : a.capacidade;
  const partes: T[][] = [];
  for (let i = 0; i < itens.length; i += tamanho) partes.push(itens.slice(i, i + tamanho));
  return partes;
}

// A etiqueta geral não lista itens (caixa de arquivo geral, ou detalhada marcada como geral).
export const usaLayoutGeral = (c: { tipo: string; etiquetaGeral: boolean }) => c.tipo === "geral" || c.etiquetaGeral;
export const cabeNaEtiqueta = (itens: ItemLista[]) => ajustarRotulos(rotulosDosItens(itens)).cabe;

export const MESES_ABREV = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
