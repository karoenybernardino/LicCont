// Conteúdo do termo (e da listagem) de eliminação, igual para PDF e Word.
// Estrutura segue a Resolução CONARQ 40/2014 (nova redação da 44/2020): a
// listagem de eliminação, o edital de ciência e o termo. Não há modelo oficial
// único para município; o modelo da prefeitura pode substituir este texto
// (decisão em aberto no plano). Sem CPF, sem nome de pessoa: as assinaturas
// são linhas em branco para a comissão.
import type { TermoCompleto } from "./tipos";
import { CLASSES, PRAZO_CIENCIA_DIAS, dataBR } from "./regras";

export type ConteudoTermo = {
  arquivo: string;
  titulo: string;
  cabecalho: string[];
  paragrafos: string[];
  tabela: { colunas: string[]; larguras: number[]; linhas: string[][] };
  assinaturas: string[];
  rodape: string;
};

const data = dataBR;
const corta = (t: string, max: number) => (t.length > max ? `${t.slice(0, max - 1)}…` : t);

export function conteudoTermo(t: Pick<TermoCompleto, "numero" | "ano" | "situacao" | "prefeitura" | "secretaria" | "editalEm" | "aprovadoEm" | "geradoEm" | "observacao" | "documentos">): ConteudoTermo {
  const aprovado = t.situacao === "aprovado";
  const numero = `${String(t.numero).padStart(3, "0")}/${t.ano}`;
  const paragrafos = [
    "Eliminação de documentos públicos conforme a Lei nº 8.159/1991 (art. 9º), a Resolução CONARQ nº 40/2014 (nova redação da Resolução nº 44/2020) e a tabela de temporalidade e destinação da prefeitura.",
    aprovado
      ? `Edital de ciência de eliminação publicado em ${data(t.editalEm)}, com prazo de ${PRAZO_CIENCIA_DIAS} dias para manifestação. Eliminação aprovada em ${data(t.aprovadoEm)} e registrada na auditoria do sistema. Os documentos listados foram desativados no acervo; o registro de cada um permanece.`
      : t.editalEm
        ? `Edital de ciência de eliminação publicado em ${data(t.editalEm)}. A aprovação só é possível depois de ${PRAZO_CIENCIA_DIAS} dias da publicação. Este documento é a listagem e ainda não é o termo.`
        : "Listagem em rascunho. O edital de ciência ainda não foi registrado. Este documento não autoriza a eliminação.",
  ];
  if (t.observacao) paragrafos.push(`Observação: ${t.observacao}`);
  return {
    arquivo: `${aprovado ? "termo" : "listagem"}-eliminacao-${String(t.numero).padStart(3, "0")}-${t.ano}`,
    titulo: aprovado ? `TERMO DE ELIMINAÇÃO DE DOCUMENTOS Nº ${numero}` : `LISTAGEM DE ELIMINAÇÃO DE DOCUMENTOS Nº ${numero}`,
    cabecalho: [t.prefeitura, `Secretaria: ${t.secretaria}`, `Listagem gerada em ${data(t.geradoEm)}`],
    paragrafos,
    tabela: {
      colunas: ["Item", "Documento", "Objeto", "Tipo", "Caixa", "Período"],
      larguras: [0.06, 0.2, 0.3, 0.14, 0.12, 0.18],
      linhas: t.documentos.map((d, i) => [
        String(i + 1), d.titulo, corta(d.objeto, 110), CLASSES[d.classe], d.caixa,
        d.inicio ? `${data(d.inicio)} a ${data(d.fim)}` : `até ${data(d.fim)}`,
      ]),
    },
    assinaturas: ["Responsável pelo arquivo", "Comissão Permanente de Avaliação de Documentos", "Autoridade que aprova a eliminação"],
    rodape: `Total: ${t.documentos.length} ${t.documentos.length === 1 ? "documento" : "documentos"}.`,
  };
}
