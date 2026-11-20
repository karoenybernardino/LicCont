import type { ClasseDoCodigo } from "./dados";

// Lógica pura do cadastro de caixa (testada em caixa.test.ts).

// Ao informar o código da classificação, classe e prazo vêm da tabela de temporalidade
// (a tipologia depende do grupo da classe: a pessoa escolhe entre as dele).
export type PreenchimentoPorCodigo = { classeId: string; grupoId: string; prazo: string; permanente: boolean };

export function preencherPorCodigo(c: ClasseDoCodigo | null): PreenchimentoPorCodigo | null {
  if (!c) return null;
  return { classeId: c.classeId, grupoId: c.grupoId, prazo: c.permanente ? "" : String(c.prazoAnos), permanente: c.permanente };
}

// Marca ou desmarca um mês (1 a 12); a lista fica ordenada e sem repetição.
export function alternarMes(meses: number[], mes: number): number[] {
  return meses.includes(mes) ? meses.filter((m) => m !== mes) : [...meses, mes].sort((a, b) => a - b);
}
