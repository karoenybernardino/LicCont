import type { Filtros } from "./filtros";
import type { ItemPesquisa, ResultadoPesquisa } from "./tipos";

// Mesmas regras de public.pesquisar_documentos, em memória: serve à
// demonstração e prova as regras de combinação no Vitest.
// Busca, período, secretaria e órgão valem para todos; modalidade só restringe
// licitações. Fundo, setor e mês são da caixa, que a demonstração não tem: com
// um deles escolhido, nada casa (como no banco, para caixa sem esses dados).
export type Linha = ItemPesquisa;

export const semAcento = (t: string) => t.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

export const PAGINA = 50;

export function aplicarFiltros(docs: Linha[], f: Filtros, limite = PAGINA): ResultadoPesquisa {
  const busca = semAcento(f.q.trim());
  const base = docs.filter((d) => {
    if (busca) {
      const texto = semAcento([d.numero, d.objeto, d.titulo_processo ?? ""].join(" "));
      const ok = busca.length >= 3 ? texto.includes(busca) : semAcento(d.numero) === busca;
      if (!ok) return false;
    }
    if (f.de !== null && d.ano < f.de) return false;
    if (f.ate !== null && d.ano > f.ate) return false;
    if (f.secretaria && d.secretaria_id !== f.secretaria) return false;
    if (f.origem && (d.origem ?? "manual") !== f.origem) return false;
    if (f.orgao && d.orgao !== f.orgao) return false;
    if (f.fundo || f.setor || f.mes !== null) return false;
    if (f.modalidade && d.tipo === "licitacao" && d.modalidade !== f.modalidade) return false;
    return true;
  });
  const contagens = {
    todos: base.length,
    licitacao: base.filter((d) => d.tipo === "licitacao").length,
    contrato: base.filter((d) => d.tipo === "contrato").length,
  };
  const daAba = base.filter((d) => f.aba === "todos" || d.tipo === f.aba);
  const ordenados = [...daAba].sort((a, b) =>
    f.ordem === "antigos"
      ? a.criado_em.localeCompare(b.criado_em) || a.id.localeCompare(b.id)
      : b.criado_em.localeCompare(a.criado_em) || b.id.localeCompare(a.id),
  );
  const inicio = Math.max(0, Number(f.cursor) || 0);
  const itens = ordenados.slice(inicio, inicio + limite).map((d) => ({
    id: d.id, tipo: d.tipo, modalidade: d.modalidade, numero: d.numero, ano: d.ano,
    objeto: d.objeto, titulo_processo: d.titulo_processo, orgao: d.orgao, secretaria_id: d.secretaria_id, criado_em: d.criado_em,
    conferido: d.conferido, codigo: d.codigo, tem_pdf: d.tem_pdf,
  }));
  const proximoInicio = inicio + limite;
  return {
    contagens,
    total: daAba.length,
    itens,
    // No banco o cursor é (criado_em, id); na demonstração é a posição na lista.
    proximo: proximoInicio < daAba.length ? { criado_em: String(proximoInicio), id: String(proximoInicio) } : null,
  };
}
