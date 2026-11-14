import type { Filtros } from "./filtros";
import type { ItemPesquisa, ResultadoPesquisa } from "./tipos";

// Mesmas regras de public.pesquisar_documentos, em memória: serve à
// demonstração e prova as regras de combinação no Vitest.
// Busca, período e secretaria valem para todos; modalidade só restringe
// licitações; situação, valor e vigência só restringem contratos.
export type Linha = ItemPesquisa & { cnpj: string | null; vigencia_inicio: string | null; vigencia_fim: string | null };

export const semAcento = (t: string) => t.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

export const PAGINA = 50;

export function aplicarFiltros(
  docs: Linha[],
  f: Filtros,
  hoje = new Date().toISOString().slice(0, 10),
  limite = PAGINA,
): ResultadoPesquisa {
  const busca = semAcento(f.q.trim());
  const digitos = f.q.replace(/\D/g, "");
  const em30 = new Date(new Date(`${hoje}T00:00:00Z`).getTime() + 30 * 86400000).toISOString().slice(0, 10);
  const base = docs.filter((d) => {
    if (busca) {
      const texto = semAcento([d.numero, d.objeto, d.empresa ?? "", d.cnpj ?? ""].join(" "));
      const ok = busca.length >= 3 ? texto.includes(busca) || (digitos.length >= 8 && !!d.cnpj && d.cnpj.startsWith(digitos)) : semAcento(d.numero) === busca || (!!digitos && d.cnpj === digitos);
      if (!ok) return false;
    }
    if (f.de !== null && d.ano < f.de) return false;
    if (f.ate !== null && d.ano > f.ate) return false;
    if (f.secretaria && d.secretaria_id !== f.secretaria) return false;
    if (f.modalidade && d.tipo === "licitacao" && d.modalidade !== f.modalidade) return false;
    if (d.tipo === "contrato") {
      if (f.situacao && d.situacao !== f.situacao) return false;
      if (f.vmin !== null && !(d.valor !== null && d.valor >= f.vmin)) return false;
      if (f.vmax !== null && !(d.valor !== null && d.valor <= f.vmax)) return false;
      if (f.vigencia) {
        const i = d.vigencia_inicio;
        const fim = d.vigencia_fim;
        const ok =
          f.vigencia === "vigentes"
            ? !!i && !!fim && i <= hoje && fim >= hoje
            : f.vigencia === "vencidos"
              ? !!fim && fim < hoje
              : !!fim && fim >= hoje && fim <= em30;
        if (!ok) return false;
      }
    }
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
      : f.ordem === "maior_valor"
        ? (b.valor ?? -1) - (a.valor ?? -1) || b.id.localeCompare(a.id)
        : b.criado_em.localeCompare(a.criado_em) || b.id.localeCompare(a.id),
  );
  const inicio = Math.max(0, Number(f.cursor) || 0);
  const itens = ordenados.slice(inicio, inicio + limite).map((d) => ({
    id: d.id, tipo: d.tipo, modalidade: d.modalidade, numero: d.numero, ano: d.ano, situacao: d.situacao,
    objeto: d.objeto, empresa: d.empresa, valor: d.valor, secretaria_id: d.secretaria_id, criado_em: d.criado_em,
    conferido: d.conferido, codigo: d.codigo, tem_pdf: d.tem_pdf,
  }));
  const proximoInicio = inicio + limite;
  return {
    contagens,
    total: daAba.length,
    itens,
    // No banco o cursor é (criado_em, id); na demonstração é a posição na lista.
    proximo: proximoInicio < daAba.length ? { criado_em: String(proximoInicio), valor: null, id: String(proximoInicio) } : null,
  };
}
