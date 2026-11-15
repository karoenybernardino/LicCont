// Textos e formatos puros da área da equipe (sem banco, testáveis).

import { AVISO_DEMO } from "@/features/demo/dados";

export type SituacaoPedido = "novo" | "contato" | "agendado" | "feito" | "descartado";

export const SITUACOES_PEDIDO: Record<SituacaoPedido, string> = {
  novo: "Novo",
  contato: "Em contato",
  agendado: "Agendado",
  feito: "Feito",
  descartado: "Descartado",
};

const STATUS: Record<string, string> = { implantacao: "Em implantação", ativa: "Ativa", suspensa: "Suspensa" };

// Código da auditoria -> frase em português. Nunca inclui nome de pessoa ou de documento.
export function textoAcao(acao: string, statusNovo?: string | null): string {
  if (acao === "prefeituras.insert") return "Prefeitura criada";
  if (acao === "prefeituras.update") return statusNovo && STATUS[statusNovo] ? `Prefeitura alterada · situação ${STATUS[statusNovo]}` : "Dados da prefeitura alterados";
  if (acao === "usuarios.insert") return "Administrador cadastrado";
  if (acao.startsWith("usuarios.")) return "Usuário alterado";
  if (acao === "tce.importar") return "Importação do TCE";
  if (acao === "tce.configurar") return "Integração TCE configurada";
  if (acao.startsWith("tce.duplicado")) return "Duplicado do TCE decidido";
  if (acao === "equipe.pedido_recebido") return "Pedido de demonstração recebido";
  if (acao === "equipe.pedido_atualizado") return "Pedido de demonstração atualizado";
  if (acao === "equipe.importar_agora") return "Importação do TCE pedida pela equipe";
  if (acao.startsWith("suporte.")) return "Suporte autorizado ou encerrado";
  return "Ação registrada";
}

const DIA = 86_400_000;
const FUSO = -3 * 3_600_000; // horário de Brasília/Ceará (sem horário de verão)
const local = (d: Date) => new Date(d.getTime() + FUSO);
const dia2 = (n: number) => String(n).padStart(2, "0");

// "hoje", "ontem", "há 3 dias" ou dd/mm para o que passa de uma semana.
export function haTempo(iso: string, agora: Date = new Date()): string {
  const dias = Math.floor((diaUtc(local(agora)) - diaUtc(local(new Date(iso)))) / DIA);
  if (dias <= 0) return "hoje";
  if (dias === 1) return "ontem";
  if (dias <= 7) return `há ${dias} dias`;
  return formatarDiaMes(iso);
}

const diaUtc = (d: Date) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());

export function formatarDiaMes(iso: string): string {
  const d = local(new Date(iso));
  return `${dia2(d.getUTCDate())}/${dia2(d.getUTCMonth() + 1)}`;
}

// "15/11 08:31".
export function formatarDiaHora(iso: string): string {
  const d = local(new Date(iso));
  return `${formatarDiaMes(iso)} ${dia2(d.getUTCHours())}:${dia2(d.getUTCMinutes())}`;
}

// "hoje, 02:04" | "ontem, 02:04" | "12/11, 14:02".
export function quando(iso: string | null, agora: Date = new Date()): string {
  if (!iso) return "—";
  const hora = formatarDiaHora(iso).slice(6);
  const rel = haTempo(iso, agora);
  return rel === "hoje" || rel === "ontem" ? `${rel}, ${hora}` : `${formatarDiaMes(iso)}, ${hora}`;
}

export function formatarReais(centavos: number | null): string {
  return centavos === null ? "—" : (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatarGb(bytes: number): string {
  const gb = bytes / 1024 ** 3;
  return gb >= 0.1 ? `${gb.toFixed(1).replace(".", ",")} GB` : `${Math.round(bytes / 1024 ** 2)} MB`;
}

// Resultado de "Importar agora" (código curto na URL -> aviso).
export const AVISOS_IMPORTAR: Record<string, { texto: string; erro: boolean }> = {
  ok: { texto: "Importação feita.", erro: false },
  erro: { texto: "Não foi possível importar agora. Tente de novo.", erro: true },
  sem_configuracao: { texto: "Esta prefeitura ainda não tem a integração configurada e ligada.", erro: true },
  demo: { texto: AVISO_DEMO, erro: false },
};
