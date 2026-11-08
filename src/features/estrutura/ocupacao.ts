// Estrutura física e ocupação calculada (nada disto é gravado no banco).
// Funções puras: servem ao banco e ao modo demonstração.

export type Galpao = { id: string; nome: string; ativo: boolean };
export type Rua = { id: string; galpaoId: string; codigo: string; ativo: boolean };
export type Modulo = { id: string; ruaId: string; numero: number; ativo: boolean };
export type Nivel = { id: string; moduloId: string; numero: number; capacidade: number; caixas: number; ativo: boolean };

export type Estrutura = {
  galpoes: Galpao[];
  galpao: Galpao | null;
  ruas: Rua[];
  modulos: Modulo[];
  niveis: Nivel[];
};

export type Resumo = { modulos: number; niveis: number; caixas: number; capacidade: number; percentual: number };

// Percentual inteiro; sem capacidade, 0 (nunca divide por zero).
export function percentual(caixas: number, capacidade: number) {
  return capacidade > 0 ? Math.round((caixas / capacidade) * 100) : 0;
}

// Só conta o que está ativo em toda a cadeia.
export function resumir(e: Estrutura, ruaId?: string): Resumo {
  const ruas = new Set(e.ruas.filter((r) => r.ativo && (!ruaId || r.id === ruaId)).map((r) => r.id));
  const modulos = new Set(e.modulos.filter((m) => m.ativo && ruas.has(m.ruaId)).map((m) => m.id));
  const niveis = e.niveis.filter((n) => n.ativo && modulos.has(n.moduloId));
  const caixas = niveis.reduce((s, n) => s + n.caixas, 0);
  const capacidade = niveis.reduce((s, n) => s + n.capacidade, 0);
  return { modulos: modulos.size, niveis: niveis.length, caixas, capacidade, percentual: percentual(caixas, capacidade) };
}

// Código da posição, igual ao da etiqueta: B-M3-N3-C02.
export function codigoPosicao(rua: string, modulo: number, nivel?: number, caixa?: number) {
  let codigo = `${rua}-M${modulo}`;
  if (nivel !== undefined) codigo += `-N${nivel}`;
  if (caixa !== undefined) codigo += `-C${String(caixa).padStart(2, "0")}`;
  return codigo;
}

const LETRAS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

// Próximo código livre de rua: A..Z, depois AA..ZZ.
export function proximaRua(usados: string[]): string | null {
  const ocupados = new Set(usados);
  for (const a of ["", ...LETRAS]) {
    for (const b of LETRAS) {
      if (!ocupados.has(a + b)) return a + b;
    }
  }
  return null;
}

// Média arredondada para o texto dos cartões ("5 por rua").
export function media(total: number, partes: number) {
  return partes > 0 ? Math.round(total / partes) : 0;
}

export const numeroBR = (n: number) => n.toLocaleString("pt-BR");
