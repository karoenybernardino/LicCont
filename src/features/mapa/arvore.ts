// Árvore Rua > Módulo > Nível > Caixa: a lista em texto ("Ver em lista"), as
// listas dependentes do "Mover documentos" e a ordem do teclado saem dela.
import type { Estrutura } from "@/features/estrutura/ocupacao";
import { codigoPosicao } from "@/features/estrutura/ocupacao";
import type { CaixaCompacta } from "./tipos";

export type NoCaixa = { id: string; numero: number; codigo: string };
export type NoNivel = { id: string; numero: number; caixas: NoCaixa[] };
export type NoModulo = { id: string; numero: number; niveis: NoNivel[] };
export type NoRua = { id: string; codigo: string; modulos: NoModulo[] };

export function montarArvore(e: Estrutura, caixas: CaixaCompacta[]): NoRua[] {
  const porNivel = new Map<string, CaixaCompacta[]>();
  for (const c of caixas) (porNivel.get(c.nivelId) ?? porNivel.set(c.nivelId, []).get(c.nivelId)!).push(c);
  const niveisPorModulo = new Map<string, typeof e.niveis>();
  for (const n of e.niveis) if (n.ativo) (niveisPorModulo.get(n.moduloId) ?? niveisPorModulo.set(n.moduloId, []).get(n.moduloId)!).push(n);
  const modulosPorRua = new Map<string, typeof e.modulos>();
  for (const m of e.modulos) if (m.ativo) (modulosPorRua.get(m.ruaId) ?? modulosPorRua.set(m.ruaId, []).get(m.ruaId)!).push(m);

  return e.ruas
    .filter((r) => r.ativo)
    .sort((a, b) => a.codigo.localeCompare(b.codigo))
    .map((r) => ({
      id: r.id,
      codigo: r.codigo,
      modulos: (modulosPorRua.get(r.id) ?? [])
        .sort((a, b) => a.numero - b.numero)
        .map((m) => ({
          id: m.id,
          numero: m.numero,
          niveis: (niveisPorModulo.get(m.id) ?? [])
            .sort((a, b) => a.numero - b.numero)
            .map((n) => ({
              id: n.id,
              numero: n.numero,
              caixas: (porNivel.get(n.id) ?? [])
                .sort((a, b) => a.numero - b.numero)
                .map((c) => ({ id: c.id, numero: c.numero, codigo: codigoPosicao(r.codigo, m.numero, n.numero, c.numero) })),
            })),
        })),
    }));
}

// Caixa pelo código ("B-M3-N3-C02"): o mapa usa para a busca e para "?codigos=".
export function indicePorCodigo(arvore: NoRua[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const r of arvore) for (const mo of r.modulos) for (const n of mo.niveis) for (const c of n.caixas) m.set(c.codigo, c.id);
  return m;
}

// Primeira caixa que combina com um código parcial ("B", "B-M3", "B-M3-N3").
export function primeiraCaixa(arvore: NoRua[], c: { rua: string; modulo?: number; nivel?: number; caixa?: number }): string | null {
  const rua = arvore.find((r) => r.codigo === c.rua);
  for (const m of rua?.modulos ?? []) {
    if (c.modulo !== undefined && m.numero !== c.modulo) continue;
    for (const n of m.niveis) {
      if (c.nivel !== undefined && n.numero !== c.nivel) continue;
      for (const x of n.caixas) if (c.caixa === undefined || x.numero === c.caixa) return x.id;
    }
  }
  return null;
}

// Rua, módulo e nível de uma caixa (para sincronizar as listas do "Mover").
export function localizarCaixa(arvore: NoRua[], id: string): { ruaId: string; moduloId: string; nivelId: string } | null {
  for (const r of arvore) for (const m of r.modulos) for (const n of m.niveis) if (n.caixas.some((c) => c.id === id)) return { ruaId: r.id, moduloId: m.id, nivelId: n.id };
  return null;
}
