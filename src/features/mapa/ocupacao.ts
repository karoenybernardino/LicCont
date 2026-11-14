import type { Faixa } from "./tipos";

// Faixa de ocupação de uma caixa. Sem capacidade, sem documentos = faixa 0.
export function faixaOcupacao(documentos: number, capacidade: number): Faixa {
  if (capacidade <= 0) return documentos > 0 ? 3 : 0;
  const p = Math.round((documentos / capacidade) * 100);
  if (p < 50) return 0;
  if (p < 90) return 1;
  return p <= 100 ? 2 : 3;
}

// Média das ocupações de várias caixas (planta: cor do módulo).
export function faixaMedia(caixas: { documentos: number; capacidade: number }[]): Faixa {
  const cap = caixas.reduce((s, c) => s + c.capacidade, 0);
  const docs = caixas.reduce((s, c) => s + c.documentos, 0);
  return faixaOcupacao(docs, cap);
}
