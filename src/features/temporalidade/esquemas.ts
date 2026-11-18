import { z } from "zod";

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

export const esquemaModelo = z.object({
  tipo: z.enum(["eliminacao", "emprestimo"], "Escolha o modelo."),
  baseLegal: z.string().trim().min(1, "Escreva o texto-base do termo.").max(1500, "O texto-base tem no máximo 1.500 caracteres."),
  assinaturas: z
    .string()
    .trim()
    .min(1, "Informe pelo menos uma linha de assinatura.")
    .max(600, "As assinaturas têm no máximo 600 caracteres.")
    .refine((t) => t.split("\n").filter((l) => l.trim()).length <= 6, "No máximo 6 linhas de assinatura."),
});
