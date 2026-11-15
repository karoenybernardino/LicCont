// Vocabulário dos documentos (plano: docs/fases/fase-3.md). As chaves são as
// gravadas no banco; os textos são os da tela.

export const TIPOS = { licitacao: "Licitação", contrato: "Contrato" } as const;
export type Tipo = keyof typeof TIPOS;

export const MODALIDADES = {
  pregao_eletronico: "Pregão Eletrônico",
  pregao_presencial: "Pregão Presencial",
  concorrencia: "Concorrência",
  concurso: "Concurso",
  leilao: "Leilão",
  dialogo_competitivo: "Diálogo Competitivo",
  dispensa: "Dispensa",
  inexigibilidade: "Inexigibilidade",
  tomada_de_precos: "Tomada de Preços",
  convite: "Convite",
} as const;
export type Modalidade = keyof typeof MODALIDADES;

export const SITUACOES_LICITACAO = {
  em_andamento: "Em andamento",
  concluida: "Concluída",
  deserta: "Deserta",
  fracassada: "Fracassada",
  revogada: "Revogada",
  anulada: "Anulada",
} as const;
export const SITUACOES_CONTRATO = { vigente: "Vigente", encerrado: "Encerrado", rescindido: "Rescindido" } as const;
export const SITUACOES: Record<string, string> = { ...SITUACOES_LICITACAO, ...SITUACOES_CONTRATO };

export function situacoesDe(tipo: Tipo): Record<string, string> {
  return tipo === "licitacao" ? SITUACOES_LICITACAO : SITUACOES_CONTRATO;
}

export type ItemPesquisa = {
  id: string;
  tipo: Tipo;
  modalidade: Modalidade | null;
  numero: string;
  ano: number;
  situacao: string;
  objeto: string;
  empresa: string | null;
  valor: number | null;
  secretaria_id: string;
  criado_em: string;
  conferido: boolean;
  origem?: "manual" | "planilha" | "tce";
  sem_endereco?: boolean;
  codigo: string | null;
  tem_pdf: boolean;
};

export type ResultadoPesquisa = {
  contagens: { todos: number; licitacao: number; contrato: number };
  total: number;
  itens: ItemPesquisa[];
  proximo: { criado_em: string; valor: number | null; id: string } | null;
};
