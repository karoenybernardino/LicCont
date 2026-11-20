// Regras puras da temporalidade (sem banco): o banco repete a mesma conta em
// app.motivo_inelegivel, e os dois precisam concordar (ver regras.test.ts).
// Datas são "AAAA-MM-DD" no fuso de São Paulo, nunca Date solto.
export type Destinacao = "eliminacao" | "guarda_permanente";
// fixo: conta do fim do ano do documento; permanente: nunca elimina (fora da fila).
export type TipoPrazo = "fixo" | "permanente";
export const TIPOS_PRAZO: Record<TipoPrazo, string> = { fixo: "Prazo fixo", permanente: "Guarda permanente" };

// Uma linha da tabela de temporalidade do órgão (classe documental).
export type Regra = {
  id: string; codigo: string; classe: string; grupoId: string; grupo: string;
  corrente: number; intermediaria: number; tipoPrazo: TipoPrazo;
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

export type DocumentoPrazo = { classe_id: string | null; ano: number };
export type EstadoPrazo =
  | { estado: "sem_regra" | "permanente" }
  | { estado: "vigente" | "vence" | "pronto"; vencimento: string; emDias: number };

// Primeiro dia em que o documento pode ser eliminado: o prazo conta do fim do ano do
// documento (ano 2025 + 5 anos = 31/12/2030, liberado em 01/01/2031). Igual a app.motivo_inelegivel.
export const vencimentoDoPrazo = (ano: number, anos: number) => paraIso(ano + anos + 1, 1, 1);

export function estadoDoPrazo(d: DocumentoPrazo, regras: Regra[], hoje: string): EstadoPrazo {
  const regra = d.classe_id ? regras.find((r) => r.id === d.classe_id) : undefined;
  if (!regra) return { estado: "sem_regra" };
  if (regra.destinacao === "guarda_permanente") return { estado: "permanente" };
  const vencimento = vencimentoDoPrazo(d.ano, regra.corrente + regra.intermediaria);
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
