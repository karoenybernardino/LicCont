import "server-only";
import { clienteSessao } from "@/lib/supabase/servidor";
import { emDemo } from "@/features/demo/dados";
import {
  MOVIMENTACOES_DEMO, PRAZOS_DEMO, PRONTOS_DEMO, REGRAS_DEMO, RESUMO_TEMPORALIDADE_DEMO, auditoriaDemo, emprestimosDemo,
} from "@/features/demo/movimento";
import { tituloDocumento } from "@/features/documentos/titulo";
import { posicaoLegivel } from "@/features/inicio/resumo";
import { quando } from "@/features/estrutura/alteracoes";
import type { ItemPesquisa } from "@/features/documentos/tipos";
import { CLASSES } from "@/features/temporalidade/regras";
import { lerRegras, lerTemporalidadeReal } from "@/features/temporalidade/dados";
import { situacaoEmprestimo } from "./situacao";
import type { Emprestimo, Movimentacao, PrazoAVencer, ProntoEliminacao, RegistroAuditoria, RegraPrazo, ResumoTemporalidade } from "./tipos";

// Empréstimos (Fase 6): sem tabela ainda, vazio em produção. Temporalidade (Fase 7): lê o banco.
export async function listarEmprestimos(): Promise<Emprestimo[]> {
  return emDemo() ? emprestimosDemo() : [];
}

export function contarEmprestimos(lista: Emprestimo[]) {
  const abertos = lista.filter((e) => !e.devolvido);
  return { abertos: abertos.length, atrasados: abertos.filter((e) => situacaoEmprestimo(e.prazo).atrasado).length };
}

export type Temporalidade = { resumo: ResumoTemporalidade; regras: RegraPrazo[]; prontos: ProntoEliminacao[]; aVencer: PrazoAVencer[] };

export async function lerTemporalidade(): Promise<Temporalidade> {
  if (emDemo()) return { resumo: RESUMO_TEMPORALIDADE_DEMO, regras: REGRAS_DEMO, prontos: PRONTOS_DEMO, aVencer: PRAZOS_DEMO };
  const [regras, real] = await Promise.all([lerRegras(), lerTemporalidadeReal()]);
  const anos = (n: number) => `${n} ${n === 1 ? "ano" : "anos"}`;
  return {
    resumo: real.resumo,
    regras: regras.map((r) => ({ tipo: CLASSES[r.classe], corrente: anos(r.corrente), intermediaria: anos(r.intermediaria), permanente: r.destinacao === "guarda_permanente" })),
    prontos: real.prontos.slice(0, 200).map((p) => ({ id: p.id, titulo: p.titulo, caixa: p.caixa, venceu: `${p.vencimento.slice(5, 7)}/${p.vencimento.slice(0, 4)}`, marcado: false, secretariaId: p.secretariaId })),
    aVencer: real.aVencer.slice(0, 4).map((p) => ({ titulo: p.titulo, posicao: posicaoLegivel(p.posicao), emDias: p.emDias })),
  };
}

// Últimas movimentações do Início: cadastros mais recentes do acervo.
export function ultimasMovimentacoes(itens: ItemPesquisa[]): Movimentacao[] {
  if (emDemo()) return MOVIMENTACOES_DEMO;
  return [...itens]
    .sort((a, b) => b.criado_em.localeCompare(a.criado_em))
    .slice(0, 4)
    .map((i) => ({
      titulo: `Cadastro · ${tituloDocumento(i)}`,
      detalhe: `${posicaoLegivel(i.codigo)} · ${quando(new Date(i.criado_em))}`,
      tag: "Cadastro",
    }));
}

const diaSeguinte = (iso: string) => new Date(Date.parse(`${iso}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);

const TABELAS_NOME: Record<string, string> = {
  documentos: "Documento", arquivos: "Arquivo", secretarias: "Secretaria", usuarios: "Usuário", vinculos: "Vínculo", prefeituras: "Prefeitura",
  ruas: "Rua", modulos: "Módulo", niveis: "Nível", caixas: "Caixa", galpoes: "Galpão", planta_elementos: "Planta",
};

// Auditoria da prefeitura (o RLS só devolve ao administrador). Só leitura.
// shortcut: até 1000 linhas mais recentes do período; paginar quando passar disso.
export async function lerAuditoria(desde: string, ate: string): Promise<RegistroAuditoria[]> {
  if (emDemo()) return auditoriaDemo();
  const sb = await clienteSessao();
  if (!sb) return [];
  const { data, error } = await sb
    .from("auditoria")
    .select("id, usuario_id, acao, alvo_tabela, criado_em, aparelho, depois")
    .gte("criado_em", `${desde}T00:00:00-03:00`)
    .lt("criado_em", `${diaSeguinte(ate)}T00:00:00-03:00`)
    .order("criado_em", { ascending: false })
    .order("id", { ascending: false })
    .limit(1000);
  if (error) throw new Error("Não foi possível ler a auditoria.");
  return (data ?? []).map((l) => {
    const d = l.depois as Record<string, unknown> | null;
    const doc = l.alvo_tabela === "documentos" && d && typeof d.numero === "string" ? tituloDocumento(d as never) : null;
    return {
      id: l.id,
      quando: l.criado_em,
      usuarioId: l.usuario_id,
      acao: l.acao,
      tabela: l.alvo_tabela,
      titulo: doc ?? (l.alvo_tabela ? (TABELAS_NOME[l.alvo_tabela] ?? null) : null),
      aparelho: l.aparelho,
    };
  });
}
