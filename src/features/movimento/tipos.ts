// Empréstimos (Fase 6) ainda não têm tabela: em produção a lista vem vazia;
// a demonstração mostra dados fictícios. Temporalidade (Fase 7) lê o banco.

export type Emprestimo = { id: string; titulo: string; objeto: string; caixa: string; quem: string; setor: string; prazo: string; devolvido: boolean };
export type RegraPrazo = { tipo: string; corrente: string; intermediaria: string; permanente: boolean };
export type ProntoEliminacao = { id: string; titulo: string; caixa: string; venceu: string; marcado: boolean; secretariaId?: string };
export type PrazoAVencer = { titulo: string; posicao: string; emDias: number };
export type Movimentacao = { titulo: string; detalhe: string; tag: string };
export type ResumoTemporalidade = { vencem90: number; prontos: number; permanentes: number };
export type RegistroAuditoria = { id: number; quando: string; usuarioId: string | null; acao: string; tabela: string | null; titulo: string | null; aparelho: string | null };
