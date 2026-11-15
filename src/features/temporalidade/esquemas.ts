import { z } from "zod";
import { CLASSES_LISTA } from "./regras";

const anos = (rotulo: string) =>
  z.preprocess((v) => (v === "" || v === undefined || v === null ? NaN : Number(v)), z.number(`Informe o prazo (${rotulo}).`).int(`O prazo (${rotulo}) é em anos inteiros.`).min(0, `O prazo (${rotulo}) não pode ser negativo.`).max(50, `O prazo (${rotulo}) é de no máximo 50 anos.`));

const regra = z.object({
  classe: z.enum(CLASSES_LISTA as [string, ...string[]], "Escolha o tipo de documento."),
  corrente: anos("fase corrente"),
  intermediaria: anos("fase intermediária"),
  destinacao: z.enum(["eliminacao", "guarda_permanente"], "Escolha a destinação final."),
});

export function lerRegra(f: FormData) {
  return regra.safeParse(Object.fromEntries(f.entries()));
}

export const esquemaTermo = z.object({
  documentos: z.array(z.uuid()).min(1, "Marque pelo menos um documento.").max(500, "No máximo 500 documentos por termo."),
  observacao: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? null : v ?? null),
    z.string().trim().max(1000, "Observação muito longa.").nullable(),
  ),
});

export const esquemaEdital = z.object({
  id: z.uuid(),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data da publicação do edital."),
});

export const esquemaId = z.object({ id: z.uuid() });
