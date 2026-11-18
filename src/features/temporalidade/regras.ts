// Regras puras da temporalidade (sem banco): o banco repete a mesma conta em
// app.motivo_inelegivel, e os dois precisam concordar (ver regras.test.ts).
// Datas são "AAAA-MM-DD" no fuso de São Paulo, nunca Date solto.
import type { Tipo } from "@/features/documentos/tipos";

export type Destinacao = "eliminacao" | "guarda_permanente";
// fixo: conta da data do documento; apos_evento: conta do evento informado; permanente: nunca elimina.
export type TipoPrazo = "fixo" | "apos_evento" | "permanente";
export const TIPOS_PRAZO: Record<TipoPrazo, string> = { fixo: "Prazo fixo", apos_evento: "Após um evento", permanente: "Guarda permanente" };

// Uma linha da tabela de temporalidade do órgão (classe documental).
export type Regra = {
  id: string; codigo: string; classe: string; grupoId: string; grupo: string;
  corrente: number; intermediaria: number; tipoPrazo: TipoPrazo; evento: string | null;
  destinacao: Destinacao; observacao: string | null; ativa: boolean;
};

// Resolução CONARQ 40/2014 (nova redação da 44/2020): o edital de ciência fica
// publicado antes da eliminação. Prazo mínimo adotado: 45 dias (confirmar com o
// jurídico da prefeitura; está em um só lugar para trocar, e no banco em
// public.descarte_aprovar).
export const PRAZO_CIENCIA_DIAS = 45;
export const AVISO_DIAS = 90;

export function hojeSaoPaulo(agora = new Date()) {
  return agora.toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
}

const partes = (iso: string) => iso.split("-").map(Number) as [number, number, number];
const paraIso = (a: number, m: number, d: number) => `${String(a).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

// Como o Postgres: 29/02 + N anos cai em 28/02 se o ano de chegada não é bissexto.
export function somarAnos(iso: string, anos: number) {
  const [a, m, d] = partes(iso);
  const alvo = a + anos;
  const ultimo = new Date(Date.UTC(alvo, m, 0)).getUTCDate();
  return paraIso(alvo, m, Math.min(d, ultimo));
}

// "AAAA-MM-DD" ou instante ISO -> DD/MM/AAAA (instante no fuso de São Paulo).
export function dataBR(iso: string | null) {
  if (!iso) return "—";
  if (iso.length === 10) return iso.split("-").reverse().join("/");
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

export function diasEntre(de: string, ate: string) {
  const [a1, m1, d1] = partes(de);
  const [a2, m2, d2] = partes(ate);
  return Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / 86_400_000);
}

export function somarDias(iso: string, dias: number) {
  const [a, m, d] = partes(iso);
  const t = new Date(Date.UTC(a, m - 1, d + dias));
  return paraIso(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
}

export type DocumentoPrazo = {
  tipo: Tipo; classe_id: string | null; data_producao: string | null; evento_em: string | null;
  vigencia_fim: string | null; encerrado_em: string | null;
};
export type EstadoPrazo =
  | { estado: "sem_regra" | "sem_data" | "aguardando_evento" | "permanente" }
  | { estado: "vigente" | "vence" | "pronto"; vencimento: string; emDias: number };

// Evento do prazo "após evento": o informado, ou o fim da vigência (contrato) / encerramento (licitação).
export function dataDoEvento(d: DocumentoPrazo) {
  return d.evento_em ?? (d.tipo === "contrato" ? d.vigencia_fim : d.tipo === "licitacao" ? d.encerrado_em : null);
}

// Mesma conta de app.motivo_inelegivel: prazo fixo conta da data do documento.
export function estadoDoPrazo(d: DocumentoPrazo, regras: Regra[], hoje: string): EstadoPrazo {
  const regra = d.classe_id ? regras.find((r) => r.id === d.classe_id) : undefined;
  if (!regra) return { estado: "sem_regra" };
  if (regra.destinacao === "guarda_permanente") return { estado: "permanente" };
  const inicio = regra.tipoPrazo === "apos_evento" ? dataDoEvento(d) : d.data_producao;
  if (!inicio) return { estado: regra.tipoPrazo === "apos_evento" ? "aguardando_evento" : "sem_data" };
  const vencimento = somarAnos(inicio, regra.corrente + regra.intermediaria);
  const emDias = diasEntre(hoje, vencimento);
  return { estado: emDias <= 0 ? "pronto" : emDias <= AVISO_DIAS ? "vence" : "vigente", vencimento, emDias };
}

// Primeiro dia em que o administrador pode aprovar: edital + 45 dias (igual ao banco).
export const aprovavelDesde = (editalPublicadoEm: string) => somarDias(editalPublicadoEm, PRAZO_CIENCIA_DIAS);

// Frase curta da lista de termos, ao lado da situação.
export function observacaoTermo(
  t: { situacao: "rascunho" | "em_ciencia" | "aprovado" | "cancelado"; editalEm: string | null; aprovadoEm: string | null; canceladoEm: string | null },
  hoje: string,
) {
  const dm = (iso: string) => dataBR(iso).slice(0, 5);
  if (t.situacao === "rascunho") return "falta registrar o edital";
  if (t.situacao === "aprovado") return `eliminados em ${dataBR(t.aprovadoEm)}`;
  if (t.situacao === "cancelado") return `cancelado em ${dataBR(t.canceladoEm)}`;
  if (!t.editalEm) return "";
  const libera = aprovavelDesde(t.editalEm);
  return hoje >= libera ? `aprovação liberada desde ${dm(libera)}` : `aprovação liberada em ${dm(libera)}`;
}

export const MOTIVOS: Record<string, string> = {
  inexistente: "Documento não encontrado.",
  inativo: "O documento está desativado.",
  sem_regra: "O documento não tem classe na tabela de temporalidade.",
  guarda_permanente: "Documento de guarda permanente não pode ser eliminado.",
  sem_data: "Falta a data do documento, de onde o prazo começa a contar.",
  aguardando_evento: "Falta informar o evento que inicia o prazo de guarda.",
  digitalizado_sem_icp: "Documento digitalizado só pode ser eliminado com assinatura ICP-Brasil.",
  prazo_nao_cumprido: "O prazo de guarda ainda não foi cumprido.",
  emprestado: "O documento está emprestado.",
  em_outro_termo: "O documento já está em outro termo.",
};

// Código de erro do banco (LD001...) -> texto para a pessoa. Sem dado do documento.
export function mensagemDoBanco(codigo: string | undefined, texto = "") {
  switch (codigo) {
    case "42501": return "Você não tem permissão para esta ação.";
    case "LD001": {
      const motivo = MOTIVOS[texto.split(": ")[1]?.trim() ?? ""];
      return motivo ? `Algum documento não pode ser eliminado. ${motivo}` : "Algum documento não pode ser eliminado.";
    }
    case "LD002": return "Escolha de 1 a 500 documentos de uma só secretaria.";
    case "LD003": return "O termo não está na etapa certa para esta ação.";
    case "LD004": return "Data do edital inválida: não pode ser futura nem anterior ao termo.";
    case "LD005": return "Quem gerou o termo não pode aprová-lo. Peça a outro administrador.";
    case "LD006": return `O prazo de ciência de ${PRAZO_CIENCIA_DIAS} dias do edital ainda não terminou.`;
    case "LD009": return "O termo já está encerrado e não pode mudar.";
    default: return "Não foi possível concluir. Tente de novo.";
  }
}
