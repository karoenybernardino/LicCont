// Vocabulário dos documentos (plano: docs/fases/fase-3.md). As chaves são as
// gravadas no banco; os textos são os da tela.

export const TIPOS = { licitacao: "Licitação", contrato: "Contrato", outro: "Documento" } as const;
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

// Órgão do documento e da caixa: um só cadastro por município, o órgão é escolhido no cadastro.
export const ORGAOS = { prefeitura: "Prefeitura", camara: "Câmara" } as const;
export type Orgao = keyof typeof ORGAOS;

// Caixa geral = arquivo geral (cadastro bruto, sem listar o conteúdo); detalhada = licitações e contratos.
export const TIPOS_CAIXA = { geral: "Arquivo geral", detalhada: "Licitações e contratos" } as const;
export type TipoCaixa = keyof typeof TIPOS_CAIXA;

export const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"] as const;

export type ItemPesquisa = {
  id: string;
  tipo: Tipo;
  modalidade: Modalidade | null;
  numero: string;
  ano: number;
  objeto: string;
  titulo_processo: string | null;
  orgao: Orgao;
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
  proximo: { criado_em: string; id: string } | null;
};
