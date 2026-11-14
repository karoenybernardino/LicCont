import { z } from "zod";
import { lerValor } from "./formato";
import { MODALIDADES, SITUACOES_CONTRATO, SITUACOES_LICITACAO } from "./tipos";

const uuid = z.guid("Escolha uma opção da lista.");
const vazioParaNulo = (v: unknown) => (v === undefined || (typeof v === "string" && v.trim() === "") ? null : v);

// CNPJ com dígito verificador. CPF (11 dígitos) é recusado de propósito.
export function cnpjValido(digitos: string) {
  if (!/^\d{14}$/.test(digitos) || /^(\d)\1{13}$/.test(digitos)) return false;
  const conta = (n: number) => {
    let soma = 0;
    let peso = n - 7;
    for (let i = 0; i < n; i++) {
      soma += Number(digitos[i]) * peso--;
      if (peso < 2) peso = 9;
    }
    const r = soma % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return conta(12) === Number(digitos[12]) && conta(13) === Number(digitos[13]);
}

const cnpj = z.preprocess(
  (v) => {
    const t = vazioParaNulo(v);
    return typeof t === "string" ? t.replace(/\D/g, "") : t;
  },
  z
    .string()
    .nullable()
    .refine((v) => v === null || v.length !== 11, "Não informe CPF: o campo é só para CNPJ de empresa.")
    .refine((v) => v === null || cnpjValido(v), "CNPJ inválido."),
);

const data = z.preprocess(vazioParaNulo, z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida.").nullable());
const valor = z.preprocess(
  (v) => (typeof v === "string" ? lerValor(v) : v),
  z.number({ error: "Valor inválido." }).min(0, "Valor inválido.").max(9_999_999_999_999).nullable(),
);

const anoMax = () => new Date().getFullYear() + 1;

export const esquemaDocumento = z
  .object({
    tipo: z.enum(["licitacao", "contrato"], { error: "Escolha o tipo." }),
    modalidade: z.preprocess(vazioParaNulo, z.enum(Object.keys(MODALIDADES) as [string, ...string[]]).nullable()),
    numero: z.string().trim().min(1, "Informe o número do processo.").max(30, "No máximo 30 caracteres."),
    ano: z.coerce.number().int().min(1950, "Ano inválido.").max(anoMax(), "Ano inválido."),
    objeto: z.string().trim().min(3, "Descreva o objeto.").max(2000, "No máximo 2.000 caracteres."),
    empresa: z.preprocess(vazioParaNulo, z.string().trim().max(200, "No máximo 200 caracteres.").nullable()),
    cnpj,
    valor,
    secretaria: uuid,
    caixa: uuid,
    situacao: z.string().min(1, "Escolha a situação."),
    vigencia_inicio: data,
    vigencia_fim: data,
  })
  .superRefine((d, ctx) => {
    const erro = (path: string, message: string) => ctx.addIssue({ code: "custom", path: [path], message });
    if (d.tipo === "licitacao") {
      if (!d.modalidade) erro("modalidade", "Escolha a modalidade.");
      if (!(d.situacao in SITUACOES_LICITACAO)) erro("situacao", "Situação inválida para licitação.");
      if (d.vigencia_inicio || d.vigencia_fim) erro("vigencia_fim", "Vigência é só de contrato.");
    } else if (!(d.situacao in SITUACOES_CONTRATO)) {
      erro("situacao", "Situação inválida para contrato.");
    }
    if (d.vigencia_inicio && d.vigencia_fim && d.vigencia_fim < d.vigencia_inicio) {
      erro("vigencia_fim", "O fim da vigência não pode vir antes do início.");
    }
  });
export type DadosDocumento = z.infer<typeof esquemaDocumento>;

export const esquemaId = z.object({ id: uuid });

export const esquemaEnvio = z.object({
  documento: uuid,
  nome: z
    .string()
    .transform((n) => n.replace(/[\u0000-\u001f\u007f\\/]/g, "").trim())
    .pipe(z.string().min(1).max(200)),
  tamanho: z.coerce.number().int().min(1),
});

// Erros do banco -> texto fixo (nunca a mensagem crua).
export function mensagemDocumento(codigo: string | undefined) {
  switch (codigo) {
    case "23505":
      return "Já existe um documento com este número.";
    case "LC004":
      return "Esta caixa está desativada. Escolha outra.";
    case "LC005":
      return "Ainda há documentos ativos nesta caixa.";
    case "42501":
      return "Você não tem permissão para esta ação.";
    case "23503":
      return "A caixa ou a secretaria escolhida não é válida.";
    default:
      return "Não foi possível salvar. Tente de novo.";
  }
}
