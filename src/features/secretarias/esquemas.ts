import { z } from "zod";

export const PRAZOS_EMPRESTIMO = [7, 10, 15, 30, 45, 60] as const;

// Campo vazio vira nulo; texto é aparado.
const texto = (max: number, msg: string) =>
  z.preprocess((v) => (v === undefined || (typeof v === "string" && v.trim() === "") ? null : v), z.string().trim().max(max, msg).nullable());
const caixa = z.preprocess((v) => v === "on", z.boolean());
const idOpcional = z.preprocess((v) => (v === undefined || v === "" ? null : v), z.uuid("Escolha uma opção da lista.").nullable());

const esquema = z.object({
  nome: z.string().trim().min(2, "Informe o nome da secretaria.").max(120, "Nome muito longo."),
  sigla: z.preprocess(
    (v) => (v === undefined || (typeof v === "string" && v.trim() === "") ? null : typeof v === "string" ? v.trim().toUpperCase() : v),
    z.string().regex(/^[A-Z0-9-]{2,12}$/, "Sigla com 2 a 12 letras ou números.").nullable(),
  ),
  ativa: z.preprocess((v) => v !== "nao", z.boolean()),
  telefone: texto(30, "Telefone muito longo."),
  email_contato: z.preprocess(
    (v) => (v === undefined || (typeof v === "string" && v.trim() === "") ? null : v),
    z.string().trim().max(200, "E-mail muito longo.").regex(/^[^@\s]+@[^@\s]+$/, "E-mail inválido.").nullable(),
  ),
  responsavel_id: idOpcional,
  cargo_responsavel: texto(120, "Cargo muito longo."),
  recebe_licitacoes: caixa,
  recebe_contratos: caixa,
  exige_aprovacao_emprestimo: caixa,
  avisar_atrasos: caixa,
  prazo_emprestimo_dias: z.preprocess(
    (v) => (v === undefined || v === null || v === "" ? 15 : Number(v)),
    z.union(PRAZOS_EMPRESTIMO.map((p) => z.literal(p)) as [z.ZodLiteral<7>, ...z.ZodLiteral<number>[]], "Escolha um prazo da lista."),
  ),
  rua_preferencial_id: idOpcional,
});

export type DadosSecretaria = z.infer<typeof esquema>;

export function lerSecretaria(f: FormData) {
  return esquema.safeParse(Object.fromEntries(f.entries()));
}
