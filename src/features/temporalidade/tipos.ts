
export type SituacaoTermo = "rascunho" | "em_ciencia" | "aprovado" | "cancelado";

export type Termo = {
  id: string; numero: number; ano: number; situacao: SituacaoTermo; secretariaId: string; secretaria: string;
  geradoPor: string; geradoEm: string; editalEm: string | null; aprovadoEm: string | null; canceladoEm: string | null;
  observacao: string | null; itens: number;
};

export type ItemTermo = {
  titulo: string; objeto: string; caixa: string; classe: string;
  inicio: string | null; fim: string | null; // datas do documento (termo em PDF e Word)
  extremos: string; // "2016 – 2019", como no quadro
  vencimento: string | null; // "AAAA-MM-DD" pela regra; null sem regra ou sem data
};

export type TermoCompleto = Termo & { prefeitura: string; documentos: ItemTermo[] };
