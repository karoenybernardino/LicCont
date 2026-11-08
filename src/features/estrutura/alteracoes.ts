// "Últimas alterações" da tela Estrutura física, a partir das linhas da
// auditoria (gravadas por gatilho). Funções puras.
import type { Estrutura } from "./ocupacao";

export type Alteracao = { titulo: string; detalhe: string; quando: Date; tipo: "Estrutura" | "Ajuste" };

export type LinhaAuditoria = {
  acao: string;
  alvo_tabela: string;
  criado_em: string;
  antes: Record<string, unknown> | null;
  depois: Record<string, unknown> | null;
};

// [singular, plural, terminação]
export const NOMES = {
  galpoes: ["Galpão", "galpões", "o"],
  ruas: ["Rua", "ruas", "a"],
  modulos: ["Módulo", "módulos", "o"],
  niveis: ["Nível", "níveis", "o"],
  caixas: ["Caixa", "caixas", "a"],
} as const;
type Tabela = keyof typeof NOMES;

// Linhas mais recentes primeiro. Inclusões da mesma operação (mesmo
// criado_em, que é a hora da transação) e do mesmo pai viram uma linha; os
// níveis criados junto com o módulo não aparecem à parte.
export function agrupar(linhas: LinhaAuditoria[], e: Estrutura): Alteracao[] {
  const rua = new Map(e.ruas.map((r) => [r.id, r]));
  const modulo = new Map(e.modulos.map((m) => [m.id, m]));
  const nivel = new Map(e.niveis.map((n) => [n.id, n]));
  const dados = (l: LinhaAuditoria) => l.depois ?? l.antes ?? {};

  const caminho = (tabela: Tabela, d: Record<string, unknown>) => {
    const n = tabela === "caixas" ? nivel.get(String(d.nivel_id)) : undefined;
    const m = modulo.get(String(tabela === "niveis" ? d.modulo_id : n?.moduloId));
    const r = rua.get(String(tabela === "modulos" ? d.rua_id : m?.ruaId));
    return [r && `Rua ${r.codigo}`, m && `M${m.numero}`, n && `N${n.numero}`].filter(Boolean).join(" · ");
  };
  const pai = (d: Record<string, unknown>) => String(d.galpao_id ?? d.rua_id ?? d.modulo_id ?? d.nivel_id ?? d.prefeitura_id);

  const comModulo = new Set(linhas.filter((l) => l.acao === "modulos.insert").map((l) => l.criado_em));
  const grupos = new Map<string, Alteracao & { total: number }>();
  let unico = 0;

  for (const l of linhas) {
    const tabela = l.alvo_tabela as Tabela;
    if (!(tabela in NOMES)) continue;
    if (l.acao === "niveis.insert" && comModulo.has(l.criado_em)) continue;
    const d = dados(l);
    const [nome, plural, fim] = NOMES[tabela];
    const inclusao = l.acao.endsWith(".insert");
    const chave = inclusao ? `${l.acao}:${pai(d)}:${l.criado_em}` : `u${unico++}`;
    const grupo = grupos.get(chave);
    if (grupo) {
      grupo.total++;
      grupo.titulo = `${grupo.total} ${plural} adicionad${fim}s`;
      continue;
    }
    const numero = tabela === "caixas" ? String(d.numero).padStart(2, "0") : (d.codigo ?? d.numero);
    const rotulo = tabela === "galpoes" ? nome : `${nome} ${numero}`;
    let verbo = `ajustad${fim}`;
    if (inclusao) verbo = `adicionad${fim}`;
    else if (l.antes?.ativo !== l.depois?.ativo) verbo = `${l.depois?.ativo ? "reativad" : "desativad"}${fim}`;
    grupos.set(chave, {
      titulo: `${rotulo} ${verbo}`,
      detalhe: caminho(tabela, d),
      quando: new Date(l.criado_em),
      tipo: inclusao ? "Estrutura" : "Ajuste",
      total: 1,
    });
  }
  return [...grupos.values()].map(({ titulo, detalhe, quando, tipo }) => ({ titulo, detalhe, quando, tipo }));
}

// "hoje, 09:40", "ontem" ou "05/11/2026", no fuso de Brasília.
export function quando(data: Date, agora = new Date()) {
  const dia = (d: Date) => d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  if (dia(data) === dia(agora)) {
    return `hoje, ${data.toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" })}`;
  }
  if (dia(data) === dia(new Date(agora.getTime() - 86_400_000))) return "ontem";
  return dia(data);
}
