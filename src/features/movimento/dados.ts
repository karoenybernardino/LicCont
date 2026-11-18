import "server-only";
import { clienteSessao } from "@/lib/supabase/servidor";
import { emDemo } from "@/features/demo/dados";
import {
  MOVIMENTACOES_DEMO, PRAZOS_DEMO, PRONTOS_DEMO, REGRAS_DEMO, RESUMO_TEMPORALIDADE_DEMO, auditoriaDemo, emprestimosDemo,
} from "@/features/demo/movimento";
import { DOCUMENTOS_DEMO, caixaDemo } from "@/features/demo/documentos";
import type { Modalidade, Tipo } from "@/features/documentos/tipos";
import { tituloDocumento } from "@/features/documentos/titulo";
import { posicaoLegivel } from "@/features/inicio/resumo";
import { quando } from "@/features/estrutura/alteracoes";
import type { ItemPesquisa } from "@/features/documentos/tipos";
import { somarDias } from "@/features/temporalidade/regras";
import type { EmprestimoParaTermo } from "./termo-emprestimo";
import { lerRegras, lerTemporalidadeReal } from "@/features/temporalidade/dados";
import { situacaoEmprestimo } from "./situacao";
import type { Emprestimo, PedidoEmprestimo, Movimentacao, PrazoAVencer, ProntoEliminacao, RegistroAuditoria, RegraPrazo, ResumoTemporalidade } from "./tipos";

// Empréstimos (Fase 6): leitura pela sessão da pessoa (o RLS limita à prefeitura
// e às secretarias dela). Temporalidade (Fase 7): lê o banco.
const FALHA_EMPRESTIMOS = "Não foi possível ler os empréstimos.";

const codigoDaCaixa = (rua: string, modulo: number, nivel: number, caixa: number) => `${rua}-M${modulo}-N${nivel}-C${String(caixa).padStart(2, "0")}`;

// Pedidos de empréstimo aguardando aprovação (só pendentes). Em demonstração não há.
export async function listarPedidos(usuarioId: string): Promise<PedidoEmprestimo[]> {
  if (emDemo()) return [];
  const sb = await clienteSessao();
  if (!sb) return [];
  const { data, error } = await sb
    .from("pedidos_emprestimo")
    .select("id, retirado_por_nome, retirado_por_setor, prazo_dias, criado_em, pedido_por, documentos(tipo, modalidade, numero, ano, objeto)")
    .eq("situacao", "pendente")
    .order("criado_em", { ascending: true })
    .limit(200);
  if (error) throw new Error(FALHA_EMPRESTIMOS);
  const limite = Date.now() - 3 * 86_400_000;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any[]).map((p) => ({
    id: p.id, titulo: tituloDocumento(p.documentos), objeto: p.documentos.objeto, quem: p.retirado_por_nome, setor: p.retirado_por_setor,
    prazoDias: p.prazo_dias, criadoEm: p.criado_em, vencido: Date.parse(p.criado_em) < limite, meu: p.pedido_por === usuarioId,
  }));
}

export async function listarEmprestimos(): Promise<Emprestimo[]> {
  if (emDemo()) return emprestimosDemo();
  const sb = await clienteSessao();
  if (!sb) return [];
  const { data, error } = await sb
    .from("emprestimos")
    .select("id, documento_id, retirado_por_nome, retirado_por_setor, prazo_em, devolvido_em, documentos(tipo, modalidade, numero, ano, objeto), caixas(numero, niveis(numero, modulos(numero, ruas(codigo))))")
    .order("prazo_em", { ascending: true })
    .limit(500);
  if (error) throw new Error(FALHA_EMPRESTIMOS);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any[]).map((e) => ({
    id: e.id,
    documentoId: e.documento_id,
    titulo: tituloDocumento(e.documentos),
    objeto: e.documentos.objeto,
    caixa: codigoDaCaixa(e.caixas.niveis.modulos.ruas.codigo, e.caixas.niveis.modulos.numero, e.caixas.niveis.numero, e.caixas.numero),
    quem: e.retirado_por_nome,
    setor: e.retirado_por_setor,
    prazo: e.prazo_em,
    devolvido: e.devolvido_em !== null,
  }));
}

// Dados do termo de empréstimo (RLS: só quem enxerga a secretaria).
export async function obterEmprestimoParaTermo(id: string): Promise<EmprestimoParaTermo | null> {
  if (emDemo()) {
    const e = emprestimosDemo().find((x) => x.id === id);
    if (!e) return null;
    return {
      prefeitura: "Prefeitura Fictícia de Exemplo", secretaria: "Secretaria de demonstração", titulo: e.titulo, objeto: e.objeto, caixa: e.caixa,
      quem: e.quem, setor: e.setor, retirada: somarDias(e.prazo, -15), prazo: e.prazo, devolvidoEm: e.devolvido ? e.prazo : null, observacao: null,
    };
  }
  const sb = await clienteSessao();
  if (!sb) return null;
  const { data } = await sb
    .from("emprestimos")
    .select("retirado_por_nome, retirado_por_setor, retirado_em, prazo_em, observacao, devolvido_em, prefeituras(nome), secretarias(nome), documentos(tipo, modalidade, numero, ano, objeto), caixas(numero, niveis(numero, modulos(numero, ruas(codigo))))")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const e = data as any;
  return {
    prefeitura: e.prefeituras?.nome ?? "Prefeitura", secretaria: e.secretarias?.nome ?? "", titulo: tituloDocumento(e.documentos), objeto: e.documentos.objeto,
    caixa: codigoDaCaixa(e.caixas.niveis.modulos.ruas.codigo, e.caixas.niveis.modulos.numero, e.caixas.niveis.numero, e.caixas.numero),
    quem: e.retirado_por_nome, setor: e.retirado_por_setor, retirada: e.retirado_em, prazo: e.prazo_em, devolvidoEm: e.devolvido_em, observacao: e.observacao,
  };
}

// Ids dos documentos com empréstimo aberto (só os que a pessoa pode ler).
// Em demonstração os documentos fictícios não têm empréstimo.
export async function documentosEmprestados(): Promise<Set<string>> {
  if (emDemo()) return new Set();
  const sb = await clienteSessao();
  if (!sb) return new Set();
  const { data, error } = await sb.from("emprestimos").select("documento_id").is("devolvido_em", null).limit(2000);
  if (error) throw new Error(FALHA_EMPRESTIMOS);
  return new Set((data ?? []).map((x) => x.documento_id as string));
}

export type DocumentoEmprestavel = { id: string; titulo: string; caixa: string; prazoDias: number };

// Documentos ativos das secretarias em que a pessoa cadastra e que não estão emprestados.
export async function documentosEmprestaveis(secretarias: string[]): Promise<DocumentoEmprestavel[]> {
  if (secretarias.length === 0) return [];
  if (emDemo()) {
    return DOCUMENTOS_DEMO.filter((d) => secretarias.includes(d.secretaria_id))
      .slice(0, 30)
      .flatMap((d) => {
        const cx = caixaDemo(d.caixa_id);
        return cx ? [{ id: d.id, titulo: tituloDocumento({ tipo: d.tipo as Tipo, modalidade: d.modalidade as Modalidade | null, numero: d.numero, ano: d.ano }), caixa: codigoDaCaixa(cx.rua.codigo, cx.modulo.numero, cx.nivel.numero, cx.numero), prazoDias: 15 }] : [];
      });
  }
  const sb = await clienteSessao();
  if (!sb) return [];
  const [docs, fora] = await Promise.all([
    sb
      .from("documentos")
      .select("id, tipo, modalidade, numero, ano, secretarias(prazo_emprestimo_dias), caixas(numero, niveis(numero, modulos(numero, ruas(codigo))))")
      .eq("ativo", true)
      .in("secretaria_id", secretarias)
      .order("criado_em", { ascending: false })
      .limit(300),
    documentosEmprestados(),
  ]);
  if (docs.error) throw new Error(FALHA_EMPRESTIMOS);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (docs.data as any[])
    .filter((d) => !fora.has(d.id))
    .map((d) => ({ id: d.id, titulo: tituloDocumento(d), caixa: codigoDaCaixa(d.caixas.niveis.modulos.ruas.codigo, d.caixas.niveis.modulos.numero, d.caixas.niveis.numero, d.caixas.numero), prazoDias: d.secretarias?.prazo_emprestimo_dias ?? 15 }));
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
    regras: regras.map((r) => ({ tipo: r.classe, corrente: anos(r.corrente), intermediaria: anos(r.intermediaria), permanente: r.destinacao === "guarda_permanente" })),
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
      detalhe: `${i.codigo ? posicaoLegivel(i.codigo) : "Sem endereço"} · ${quando(new Date(i.criado_em))}`,
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
