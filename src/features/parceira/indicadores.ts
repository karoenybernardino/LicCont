// Indicadores da empresa parceira. Funções puras: recebem as linhas do banco (ou da demonstração).
import { capacidadeTotal, emAlerta, percentualOcupacao } from "@/features/estrutura/capacidade";

export type Orgao = "prefeitura" | "camara";
export type Linha = { dia: string; usuarioId: string | null; pessoa: string | null; orgao: Orgao | null; caixas: number; documentos: number; etiquetas: number };
export type Resumo = {
  id: string;
  nome: string;
  caixas: number;
  caixasPrefeitura: number;
  caixasCamara: number;
  documentos: number;
  aEtiquetar: number;
  funcionarios: number;
  modulos: number;
  caixasPorModulo: number;
  ultimaAtividade: string | null;
};
export type Agrupar = "dia" | "semana" | "mes";

// Segunda-feira da semana, em UTC (as datas já vêm como dia civil AAAA-MM-DD).
export function inicioDaSemana(dia: string): string {
  const d = new Date(`${dia}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}
export const periodoDe = (dia: string, a: Agrupar) => (a === "dia" ? dia : a === "semana" ? inicioDaSemana(dia) : dia.slice(0, 7));

export function caixasPorOrgao(r: Resumo[]) {
  const prefeitura = r.reduce((s, x) => s + x.caixasPrefeitura, 0);
  const camara = r.reduce((s, x) => s + x.caixasCamara, 0);
  return { prefeitura, camara, total: prefeitura + camara };
}

// Caixas cadastradas por período e órgão (evolução semanal ou mensal).
export function evolucaoCaixas(l: Linha[], a: Exclude<Agrupar, "dia">) {
  const m = new Map<string, { periodo: string; prefeitura: number; camara: number; total: number }>();
  for (const x of l) {
    if (!x.caixas) continue;
    const p = periodoDe(x.dia, a);
    const e = m.get(p) ?? { periodo: p, prefeitura: 0, camara: 0, total: 0 };
    if (x.orgao === "camara") e.camara += x.caixas;
    else e.prefeitura += x.caixas;
    e.total += x.caixas;
    m.set(p, e);
  }
  return [...m.values()].sort((x, y) => x.periodo.localeCompare(y.periodo));
}

// Ocupação do arquivo (caixas ativas / capacidade) com alerta acima de 90%.
export function ocupacaoDe(r: Pick<Resumo, "caixas" | "modulos" | "caixasPorModulo">) {
  const total = capacidadeTotal(r.modulos, r.caixasPorModulo);
  const percentual = percentualOcupacao(r.caixas, total);
  return { total, ocupadas: r.caixas, percentual, alerta: emAlerta(percentual) };
}

// Produção de cada pessoa da empresa (caixas e documentos por dia ou semana). Linhas sem pessoa (servidores da prefeitura) ficam de fora.
export function producaoPorPessoa(l: Linha[], a: Exclude<Agrupar, "mes"> = "dia") {
  const m = new Map<string, { pessoa: string; periodo: string; caixas: number; documentos: number }>();
  for (const x of l) {
    if (!x.pessoa || (!x.caixas && !x.documentos)) continue;
    const k = `${x.pessoa}|${periodoDe(x.dia, a)}`;
    const e = m.get(k) ?? { pessoa: x.pessoa, periodo: periodoDe(x.dia, a), caixas: 0, documentos: 0 };
    e.caixas += x.caixas;
    e.documentos += x.documentos;
    m.set(k, e);
  }
  return [...m.values()].sort((x, y) => y.periodo.localeCompare(x.periodo) || x.pessoa.localeCompare(y.pessoa));
}

export function totaisPorPessoa(l: Linha[]) {
  const m = new Map<string, { pessoa: string; caixas: number; documentos: number; etiquetas: number }>();
  for (const x of l) {
    if (!x.pessoa) continue;
    const e = m.get(x.pessoa) ?? { pessoa: x.pessoa, caixas: 0, documentos: 0, etiquetas: 0 };
    e.caixas += x.caixas;
    e.documentos += x.documentos;
    e.etiquetas += x.etiquetas;
    m.set(x.pessoa, e);
  }
  return [...m.values()].sort((x, y) => y.caixas + y.documentos - (x.caixas + x.documentos) || x.pessoa.localeCompare(y.pessoa));
}

// Etiquetas impressas desde "desde" (AAAA-MM-DD) e caixas ainda pendentes.
export function etiquetas(l: Linha[], r: Resumo[], desde: string) {
  return {
    impressas: l.filter((x) => x.dia >= desde).reduce((s, x) => s + x.etiquetas, 0),
    pendentes: r.reduce((s, x) => s + x.aEtiquetar, 0),
    prefeiturasComPendencia: r.filter((x) => x.aEtiquetar > 0).length,
  };
}

// Prefeituras com ocupação em alerta, da mais cheia para a mais vazia.
export const emAlertaDeOcupacao = (r: Resumo[]) =>
  r.map((x) => ({ id: x.id, nome: x.nome, ...ocupacaoDe(x) })).filter((x) => x.alerta).sort((a, b) => b.percentual - a.percentual);
