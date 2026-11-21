// Os relatórios da Fase 9 e o que cada um aceita de filtro.
// Nenhum relatório carrega CPF: os dados vêm das mesmas leituras das telas
// (que já não trazem CPF) e passam pelo RLS de quem baixa.

export const RELATORIOS = {
  inventario: { nome: "Inventário por secretaria", descricao: "Todos os documentos ativos, com secretaria, endereço na caixa e órgão.", periodo: false },
  sem_endereco: { nome: "Documentos sem endereço", descricao: "Documentos importados que ainda não têm caixa no galpão.", periodo: false },
  emprestimos_atraso: { nome: "Empréstimos em atraso", descricao: "Quem retirou, quando era o prazo e há quantos dias está atrasado.", periodo: false },
  descartes: { nome: "Descartes previstos no período", descricao: "Documentos cujo prazo de guarda termina no período escolhido.", periodo: true },
} as const;

export type IdRelatorio = keyof typeof RELATORIOS;
export const IDS_RELATORIO = Object.keys(RELATORIOS) as IdRelatorio[];
export type Formato = "pdf" | "planilha";

export type Filtros = { secretaria: string | null; de: string | null; ate: string | null };

export type Relatorio = {
  id: IdRelatorio | "auditoria_equipe";
  titulo: string;
  linhasDeCabecalho: string[];
  colunas: string[];
  larguras: number[]; // fração da largura útil; soma 1
  linhas: string[][];
};

const data = /^\d{4}-\d{2}-\d{2}$/;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Lê o pedido (vem da URL): valor estranho vira "sem filtro".
export function lerPedido(p: URLSearchParams): { id: IdRelatorio | null; formato: Formato | null; filtros: Filtros } {
  const id = p.get("relatorio");
  const formato = p.get("formato");
  const de = p.get("de");
  const ate = p.get("ate");
  const sec = p.get("secretaria");
  return {
    id: id && id in RELATORIOS ? (id as IdRelatorio) : null,
    formato: formato === "pdf" || formato === "planilha" ? formato : null,
    filtros: { secretaria: sec && uuid.test(sec) ? sec : null, de: de && data.test(de) ? de : null, ate: ate && data.test(ate) ? ate : null },
  };
}

export const dataBR = (iso: string | null) => (iso ? iso.split("-").reverse().join("/") : "—");

// Frase do cabeçalho com os filtros usados.
export function descreverFiltros(f: Filtros, nomeSecretaria: string | null, comPeriodo: boolean) {
  const partes = [nomeSecretaria ?? "Todas as secretarias"];
  if (comPeriodo) partes.unshift(f.de || f.ate ? `De ${dataBR(f.de)} a ${dataBR(f.ate)}` : "Sem limite de período");
  return partes.join(" · ");
}
