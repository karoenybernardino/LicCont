import { z } from "zod";

// Empréstimo: datas "AAAA-MM-DD" em Brasília. Prazo máximo de 60 dias
// (mesmo limite do banco e da maior opção de prazo das secretarias).
export const PRAZO_MAXIMO_DIAS = 60;

const dia = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe uma data válida.").refine((v) => !Number.isNaN(Date.parse(`${v}T00:00:00Z`)), "Informe uma data válida.");
const texto = (rotulo: string, max: number) =>
  z.string().trim().min(1, `Informe ${rotulo}.`).max(max, `${rotulo[0].toUpperCase()}${rotulo.slice(1)} é longo demais.`);

export const hojeBrasilia = (agora = new Date()) => agora.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
const dias = (iso: string) => Date.parse(`${iso}T00:00:00Z`) / 86_400_000;

export const esquemaEmprestimo = z
  .object({
    documento: z.guid("Escolha o documento."),
    nome: texto("quem retirou", 120),
    setor: texto("o setor", 120),
    retirada: dia,
    prazo: dia,
    observacao: z.string().trim().max(500, "A observação é longa demais.").optional().default(""),
  })
  .superRefine((v, ctx) => {
    if (dias(v.retirada) > dias(hojeBrasilia())) ctx.addIssue({ code: "custom", path: ["retirada"], message: "A retirada não pode ser no futuro." });
    if (dias(v.prazo) < dias(v.retirada)) ctx.addIssue({ code: "custom", path: ["prazo"], message: "O prazo não pode ser antes da retirada." });
    else if (dias(v.prazo) - dias(v.retirada) > PRAZO_MAXIMO_DIAS) ctx.addIssue({ code: "custom", path: ["prazo"], message: `O prazo máximo é de ${PRAZO_MAXIMO_DIAS} dias.` });
  });

export const esquemaDecisao = z.object({ id: z.guid(), acao: z.enum(["aprovar", "recusar"]) });

export const esquemaDevolucao = z.object({ id: z.guid() });
