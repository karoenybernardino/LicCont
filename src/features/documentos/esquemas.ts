import { z } from "zod";
import { hojeSaoPaulo } from "@/features/temporalidade/regras";
import { lerValor } from "./formato";
import { MODALIDADES, SITUACOES_CONTRATO, SITUACOES_LICITACAO, SITUACOES_OUTRO } from "./tipos";

const uuid = z.guid("Escolha uma opção da lista.");
const vazioParaNulo = (v: unknown) => (v === undefined || (typeof v === "string" && v.trim() === "") ? null : v);

// CPF com dígito verificador (credor pessoa física). Vai para coluna própria.
export function cpfValido(digitos: string) {
  if (!/^\d{11}$/.test(digitos) || /^(\d)\1{10}$/.test(digitos)) return false;
  const conta = (n: number) => {
    let soma = 0;
    for (let i = 0; i < n; i++) soma += Number(digitos[i]) * (n + 1 - i);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return conta(9) === Number(digitos[9]) && conta(10) === Number(digitos[10]);
}

// CNPJ com dígito verificador.
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
    .refine((v) => v === null || (v.length === 11 ? cpfValido(v) : cnpjValido(v)), "CNPJ ou CPF inválido."),
);

const data = z.preprocess(vazioParaNulo, z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida.").nullable());
const valor = z.preprocess(
  (v) => (typeof v === "string" ? lerValor(v) : v),
  z.number({ error: "Valor inválido." }).min(0, "Valor inválido.").max(9_999_999_999_999).nullable(),
);

// CPF nunca entra em texto livre (objeto, empresa): só no campo próprio de CNPJ ou CPF.
const temCpf = (t: string | null) => !t || !/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/.test(t);
const MSG_CPF = "Não escreva CPF aqui. Use o campo CNPJ ou CPF.";

const anoMax = () => new Date().getFullYear() + 1;

export const esquemaDocumento = z
  .object({
    tipo: z.enum(["licitacao", "contrato", "outro"], { error: "Escolha o tipo." }),
    modalidade: z.preprocess(vazioParaNulo, z.enum(Object.keys(MODALIDADES) as [string, ...string[]]).nullable()),
    numero: z.string().trim().min(1, "Informe o número do processo.").max(30, "No máximo 30 caracteres."),
    ano: z.coerce.number().int().min(1950, "Ano inválido.").max(anoMax(), "Ano inválido."),
    objeto: z.string().trim().min(3, "Descreva o objeto.").max(2000, "No máximo 2.000 caracteres.").refine(temCpf, MSG_CPF),
    empresa: z.preprocess(vazioParaNulo, z.string().trim().max(200, "No máximo 200 caracteres.").refine(temCpf, MSG_CPF).nullable()),
    cnpj,
    valor,
    secretaria: uuid,
    caixa: uuid,
    situacao: z.string().min(1, "Escolha a situação."),
    vigencia_inicio: data,
    vigencia_fim: data,
    // Evento do prazo de guarda da licitação; contrato conta do fim da vigência.
    encerrado_em: data,
    // Classificação: a classe define o grupo e o prazo; tipologia é opcional.
    classe: uuid,
    tipologia: z.preprocess(vazioParaNulo, uuid.nullable()),
    // Data em que o documento foi feito: de onde o prazo fixo conta e que sai na etiqueta.
    data_producao: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data do documento."),
    observacao: z.preprocess(vazioParaNulo, z.string().trim().max(300, "No máximo 300 caracteres.").refine(temCpf, MSG_CPF).nullable()),
    volume: z.preprocess((v) => (v === "" || v === undefined ? 1 : v), z.coerce.number().int("Volume inválido.").min(1, "Volume inválido.").max(99, "Volume inválido.")),
    evento_em: data,
  })
  .superRefine((d, ctx) => {
    const erro = (path: string, message: string) => ctx.addIssue({ code: "custom", path: [path], message });
    if (d.data_producao > hojeSaoPaulo()) erro("data_producao", "A data do documento não pode ser no futuro.");
    if (d.tipo === "outro") {
      if (!(d.situacao in SITUACOES_OUTRO)) erro("situacao", "Situação inválida.");
      if (d.modalidade) erro("modalidade", "Modalidade é só de licitação.");
      if (d.vigencia_inicio || d.vigencia_fim || d.encerrado_em) erro("vigencia_fim", "Vigência e encerramento são só de licitação e contrato.");
    } else if (d.tipo === "licitacao") {
      if (!d.modalidade) erro("modalidade", "Escolha a modalidade.");
      if (!(d.situacao in SITUACOES_LICITACAO)) erro("situacao", "Situação inválida para licitação.");
      if (d.vigencia_inicio || d.vigencia_fim) erro("vigencia_fim", "Vigência é só de contrato.");
    } else {
      if (!(d.situacao in SITUACOES_CONTRATO)) erro("situacao", "Situação inválida para contrato.");
      if (d.encerrado_em) erro("encerrado_em", "Encerramento é só de licitação.");
    }
    if (d.encerrado_em && d.encerrado_em > hojeSaoPaulo()) erro("encerrado_em", "O encerramento não pode ser no futuro.");
    if (d.encerrado_em && d.encerrado_em < `${d.ano}-01-01`) erro("encerrado_em", "O encerramento não pode vir antes do ano do processo.");
    if (d.vigencia_inicio && d.vigencia_fim && d.vigencia_fim < d.vigencia_inicio) {
      erro("vigencia_fim", "O fim da vigência não pode vir antes do início.");
    }
  })
  // 14 dígitos vão para cnpj; 11, para cpf_credor (coluna própria, fora da auditoria e da busca).
  .transform((d) => ({ ...d, cnpj: d.cnpj?.length === 14 ? d.cnpj : null, cpf_credor: d.cnpj?.length === 11 ? d.cnpj : null }));
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
    case "LC007":
      return "O espaço de armazenamento da prefeitura acabou. Fale com a equipe LicCONT.";
    case "42501":
      return "Você não tem permissão para esta ação.";
    case "23503":
      return "A caixa, a secretaria ou a classe escolhida não é válida.";
    case "23502":
      return "Escolha o grupo e a classe do documento.";
    default:
      return "Não foi possível salvar. Tente de novo.";
  }
}
