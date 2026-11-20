// Capacidade do arquivo, em CAIXAS. Funções puras (banco e demonstração).
// Regra: cada nível comporta 6 caixas; cada módulo tem 30 ou 36 (configurável por órgão).

export const CAIXAS_POR_NIVEL = 6;
export const OPCOES_CAIXAS_POR_MODULO = [30, 36] as const;
export const CAIXAS_POR_MODULO_PADRAO = 36;
export const LIMITE_ALERTA = 90;

export type LinhaModulo = { rua: string; modulo: number; ocupadas: number };
export type LinhaNivel = { nivel: number; ocupadas: number };
export type CapacidadeBruta = { caixas_por_modulo: number; por_modulo: LinhaModulo[]; por_nivel: LinhaNivel[] };
export type Barra = { rotulo: string; ocupadas: number; total: number; percentual: number };
export type Capacidade = {
  caixasPorModulo: number;
  modulos: number;
  total: number;
  ocupadas: number;
  livres: number;
  percentual: number;
  alerta: boolean;
  porRua: Barra[];
  porModulo: Barra[];
  porNivel: Barra[];
};

export const niveisPorModulo = (caixasPorModulo: number) => Math.floor(caixasPorModulo / CAIXAS_POR_NIVEL);
export const capacidadeTotal = (modulos: number, caixasPorModulo: number) => Math.max(0, modulos) * caixasPorModulo;
export const percentualOcupacao = (ocupadas: number, total: number) => (total > 0 ? Math.round((ocupadas / total) * 100) : 0);
// Reutilizável (passo 8): alerta quando a ocupação passa de 90%.
export const emAlerta = (percentual: number, limite = LIMITE_ALERTA) => percentual > limite;
// Posição da caixa dentro do módulo: nível 3, caixa 5 -> 17.
export const numeroNoModulo = (nivel: number, caixa: number) => (nivel - 1) * CAIXAS_POR_NIVEL + caixa;
export const textoCaixaNoModulo = (nivel: number, caixa: number, caixasPorModulo: number) =>
  `Caixa ${numeroNoModulo(nivel, caixa)} de ${caixasPorModulo}`;
export const textoCaixasLivres = (n: number) => `${n} ${n === 1 ? "caixa livre" : "caixas livres"}`;

const barra = (rotulo: string, ocupadas: number, total: number): Barra => ({ rotulo, ocupadas, total, percentual: percentualOcupacao(ocupadas, total) });

export function montarCapacidade(b: CapacidadeBruta): Capacidade {
  const cpm = b.caixas_por_modulo;
  const modulos = b.por_modulo.length;
  const total = capacidadeTotal(modulos, cpm);
  const ocupadas = b.por_modulo.reduce((s, m) => s + m.ocupadas, 0);
  const ruas = new Map<string, { modulos: number; ocupadas: number }>();
  for (const m of b.por_modulo) {
    const r = ruas.get(m.rua) ?? { modulos: 0, ocupadas: 0 };
    ruas.set(m.rua, { modulos: r.modulos + 1, ocupadas: r.ocupadas + m.ocupadas });
  }
  const percentual = percentualOcupacao(ocupadas, total);
  return {
    caixasPorModulo: cpm,
    modulos,
    total,
    ocupadas,
    livres: Math.max(total - ocupadas, 0),
    percentual,
    alerta: emAlerta(percentual),
    porRua: [...ruas].sort(([a], [z]) => a.localeCompare(z)).map(([rua, r]) => barra(`Rua ${rua}`, r.ocupadas, capacidadeTotal(r.modulos, cpm))),
    porModulo: b.por_modulo.map((m) => barra(`${m.rua}-M${m.modulo}`, m.ocupadas, cpm)),
    porNivel: [...b.por_nivel].sort((a, z) => a.nivel - z.nivel).map((n) => barra(`Nível ${n.nivel}`, n.ocupadas, modulos * CAIXAS_POR_NIVEL)),
  };
}
