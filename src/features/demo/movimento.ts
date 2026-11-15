// Empréstimos, temporalidade, movimentações e auditoria fictícios do modo
// demonstração (como nos quadros). Nada aqui é dado real e nada é salvo.
import type { Emprestimo, Movimentacao, PrazoAVencer, ProntoEliminacao, RegistroAuditoria, RegraPrazo, ResumoTemporalidade } from "@/features/movimento/tipos";
import { USUARIOS_DEMO } from "./dados";

const brasilia = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
const somar = (agora: Date, dias: number) => brasilia(new Date(agora.getTime() + dias * 86_400_000));

// Prazo = hoje + deslocamento (negativo = atrasado).
const EMPRESTIMOS: [string, string, string, string, string, string, number][] = [
  ["Contrato 041/2022", "Manutenção de ar-condicionado", "B-M3-N3-C02", "Maria Fictícia", "Educação", "", -10],
  ["Pregão Eletrônico 009/2023", "Material de expediente", "B-M3-N3-C03", "João Fictício", "Administração", "", -6],
  ["Dispensa 027/2021", "Serviço de dedetização", "D-M5-N4-C04", "Ana Fictícia", "Saúde", "", -4],
  ["Tomada de Preços 003/2022", "Reforma de escola municipal", "C-M2-N1-C01", "Carlos Fictício", "Obras", "", 4],
  ["Pregão Eletrônico 015/2023", "Equipamentos hospitalares", "B-M3-N3-C02", "Paula Fictícia", "Saúde", "", 12],
  ["Contrato 012/2021", "Locação de veículos", "C-M1-N2-C07", "Rui Fictício", "Transportes", "", 17],
  ["Contrato 038/2022", "Serviços de limpeza", "C-M1-N2-C04", "Ana Fictícia", "Saúde", "", -20],
];

export function emprestimosDemo(agora = new Date()): Emprestimo[] {
  return EMPRESTIMOS.map(([titulo, objeto, caixa, quem, setor, , d], i) => ({
    id: `de600000-0000-0000-0000-${String(i + 1).padStart(12, "0")}`,
    titulo, objeto, caixa, quem, setor, prazo: somar(agora, d), devolvido: i === EMPRESTIMOS.length - 1,
  }));
}

export const REGRAS_DEMO: RegraPrazo[] = [
  { tipo: "Processo licitatório", corrente: "2 anos", intermediaria: "5 anos", permanente: false },
  { tipo: "Contrato administrativo", corrente: "5 anos", intermediaria: "5 anos", permanente: false },
  { tipo: "Termo aditivo", corrente: "5 anos", intermediaria: "5 anos", permanente: false },
  { tipo: "Dispensa e inexigibilidade", corrente: "2 anos", intermediaria: "3 anos", permanente: false },
  { tipo: "Ata de registro de preços", corrente: "2 anos", intermediaria: "3 anos", permanente: false },
  { tipo: "Convênio e prestação de contas", corrente: "5 anos", intermediaria: "10 anos", permanente: true },
];

export const PRONTOS_DEMO: ProntoEliminacao[] = [
  { id: "1", titulo: "Dispensa 003/2016", caixa: "D-M1-N1-C02", venceu: "03/2026", marcado: true },
  { id: "2", titulo: "Contrato 019/2015", caixa: "D-M1-N1-C05", venceu: "05/2026", marcado: true },
  { id: "3", titulo: "Pregão Eletrônico 008/2016", caixa: "D-M2-N1-C01", venceu: "08/2026", marcado: true },
  { id: "4", titulo: "Dispensa 014/2016", caixa: "D-M2-N1-C03", venceu: "09/2026", marcado: false },
];

export const RESUMO_TEMPORALIDADE_DEMO: ResumoTemporalidade = { vencem90: 27, prontos: 9, permanentes: 312 };

export const PRAZOS_DEMO: PrazoAVencer[] = [
  { titulo: "Dispensa 011/2018", posicao: "Rua D · M2 · N1 · C09", emDias: 18 },
  { titulo: "Contrato 007/2017", posicao: "Rua D · M1 · N2 · C03", emDias: 41 },
  { titulo: "Pregão Eletrônico 022/2018", posicao: "Rua C · M5 · N1 · C11", emDias: 73 },
  { titulo: "Tomada de Preços 001/2018", posicao: "Rua C · M4 · N2 · C06", emDias: 86 },
];

export const MOVIMENTACOES_DEMO: Movimentacao[] = [
  { titulo: "Cadastro · Pregão Eletrônico 015/2023", detalhe: "Rua B · M3 · N3 · C02 · hoje, 09:12", tag: "Cadastro" },
  { titulo: "Devolução · Contrato 038/2022", detalhe: "Rua C · M1 · N2 · C04 · hoje, 08:40", tag: "Devolução" },
  { titulo: "Empréstimo · Dispensa 027/2021", detalhe: "Rua D · M5 · N4 · C04 · ontem, 16:05", tag: "Empréstimo" },
  { titulo: "Etiqueta impressa · Caixa 18", detalhe: "Rua A · M2 · N1 · C18 · ontem, 14:30", tag: "Etiqueta" },
];

// Linhas fictícias da auditoria, de hoje para trás.
export function auditoriaDemo(agora = new Date()): RegistroAuditoria[] {
  const u = USUARIOS_DEMO;
  const linhas: [string, number, string, string, string | null, string | null][] = [
    [u[2].id, 20, "emprestimos.insert", "emprestimos", "Pregão Eletrônico 015/2023", "Windows"],
    [u[2].id, 80, "documentos.insert", "documentos", "Pregão Eletrônico 015/2023", "Windows"],
    [u[1].id, 5 * 60, "devolucao.insert", "emprestimos", "Contrato 038/2022", "Windows"],
    [u[0].id, 8 * 60, "descarte.termo", "descarte", "Dispensa 003/2016", "Windows"],
    [u[1].id, 12 * 60, "documentos.update", "documentos", "Tomada de Preços 003/2022", "Windows"],
    [u[0].id, 20 * 60, "sessao.entrada", "usuarios", null, "Mobile"],
    [u[2].id, 30 * 60, "documentos.update", "documentos", "Caixa 18", "Windows"],
  ];
  return linhas.map(([usuarioId, min, acao, tabela, titulo, aparelho], i) => ({
    id: 1000 - i,
    quando: new Date(agora.getTime() - min * 60_000).toISOString(),
    usuarioId, acao, tabela, titulo, aparelho,
  }));
}
