import { paraCsv } from "@/features/importacao/planilha";
import type { Relatorio } from "@/features/relatorios/definicoes";
import type { AcaoEquipe, RodadaTce } from "./dados";
import { formatarDiaHora, textoAcao } from "./textos";

// Código curto do lote para a tela: data + 4 primeiros caracteres do id.
export const codigoLote = (iso: string, id: string) => `${iso.slice(0, 4)}-${iso.slice(5, 7)}${iso.slice(8, 10)}-${id.slice(0, 4)}`;

const ERROS_TCE: Record<string, string> = { indisponivel: "TCE fora do ar", formato: "Formato desconhecido", sem_configuracao: "Sem configuração", interno: "Erro interno" };
export const textoErroTce = (c: string | null) => (c ? (ERROS_TCE[c] ?? "Erro") : "");

// CSV do histórico do TCE: só números, datas e código de erro em texto fixo.
export function historicoParaCsv(rodadas: RodadaTce[]): string {
  return paraCsv([
    ["prefeitura", "origem", "situacao", "novos", "duplicados", "ja_existentes", "erro", "iniciada_em"],
    ...rodadas.map((r) => [r.prefeitura, r.origem, r.situacao, String(r.novos), String(r.duplicados), String(r.jaExistentes), textoErroTce(r.erro), r.iniciadaEm]),
  ]);
}

// Auditoria da equipe no formato do gerador de PDF de relatórios.
export function auditoriaParaRelatorio(acoes: AcaoEquipe[], filtros: string[]): Relatorio {
  return {
    id: "auditoria_equipe",
    titulo: "Auditoria da equipe LicCONT",
    linhasDeCabecalho: filtros,
    colunas: ["Quando", "Quem", "Ação", "Prefeitura", "Origem (IP)"],
    larguras: [0.14, 0.16, 0.3, 0.26, 0.14],
    linhas: acoes.map((a) => [formatarDiaHora(a.criadoEm), a.quem, textoAcao(a.acao, a.statusNovo), a.prefeitura ?? "—", a.ip ?? "—"]),
  };
}

export type FiltrosAuditoria = { dias: 7 | 30 | null; prefeitura: string | null; acao: string | null };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Lê os filtros da URL; valor estranho vira "sem filtro".
export function lerFiltrosAuditoria(p: URLSearchParams): FiltrosAuditoria {
  const d = p.get("dias");
  const pref = p.get("prefeitura") ?? "";
  const acao = (p.get("acao") ?? "").slice(0, 80);
  return { dias: d === "7" ? 7 : d === "30" ? 30 : null, prefeitura: UUID.test(pref) ? pref : null, acao: acao || null };
}

export const aplicarFiltroAcao = (acoes: AcaoEquipe[], acao: string | null) => (acao ? acoes.filter((a) => textoAcao(a.acao, a.statusNovo) === acao) : acoes);
