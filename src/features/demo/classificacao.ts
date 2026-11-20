// Grupos, tipologias e classes fictícios do modo demonstração (sem banco, sem salvar).
import type { Regra } from "@/features/temporalidade/regras";

export type GrupoDoc = { id: string; chave: string | null; nome: string; restrito: boolean; ativo: boolean };
export type TipologiaDoc = { id: string; grupoId: string; nome: string };

const g = (n: number) => `de800000-0000-0000-0000-${String(n).padStart(12, "0")}`;
export const GRUPOS_DEMO: GrupoDoc[] = [
  { id: g(1), chave: "administrativo", nome: "Administrativo", restrito: false, ativo: true },
  { id: g(2), chave: "licitacoes_contratos", nome: "Licitações e Contratos", restrito: false, ativo: true },
  { id: g(3), chave: "financeiro_contabil", nome: "Financeiro e Contábil", restrito: false, ativo: true },
  { id: g(4), chave: "rh", nome: "Recursos Humanos", restrito: true, ativo: true },
  { id: g(5), chave: "juridico", nome: "Jurídico", restrito: true, ativo: true },
  { id: g(6), chave: "tecnico_obras", nome: "Técnico e Obras", restrito: false, ativo: true },
  { id: g(7), chave: "correspondencias_cadastros", nome: "Correspondências e Cadastros", restrito: false, ativo: true },
];

export const TIPOLOGIAS_DEMO: TipologiaDoc[] = [
  { id: "de810000-0000-0000-0000-000000000001", grupoId: g(1), nome: "Ofício" },
  { id: "de810000-0000-0000-0000-000000000002", grupoId: g(1), nome: "Portaria" },
  { id: "de810000-0000-0000-0000-000000000003", grupoId: g(3), nome: "Nota fiscal" },
  { id: "de810000-0000-0000-0000-000000000004", grupoId: g(6), nome: "Alvará" },
];

const c = (n: number, codigo: string, classe: string, anos: number, tipoPrazo: Regra["tipoPrazo"]): Regra => ({
  id: `de820000-0000-0000-0000-${String(n).padStart(12, "0")}`, codigo, classe, grupoId: g(2), grupo: "Licitações e Contratos",
  corrente: anos, intermediaria: 0, tipoPrazo, destinacao: "eliminacao", observacao: null, ativa: true,
});
export const CLASSES_DEMO: Regra[] = [
  c(1, "031", "Licitações e Contratos", 12, "fixo"),
  c(2, "032", "Contratos e aditivos", 10, "fixo"),
  c(3, "033", "Convênios", 10, "fixo"),
  c(4, "034", "Atas de registro de preços", 5, "fixo"),
  c(5, "035", "Dispensas e inexigibilidades", 5, "fixo"),
];
