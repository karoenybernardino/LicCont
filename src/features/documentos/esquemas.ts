import { z } from "zod";
import { MODALIDADES } from "./tipos";

const uuid = z.guid("Escolha uma opção da lista.");
const vazioParaNulo = (v: unknown) => (v === undefined || (typeof v === "string" && v.trim() === "") ? null : v);

// CPF com dígito verificador. O documento não guarda mais CPF; a conta fica para quem valida o dado.
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

// CPF nunca entra em texto livre (objeto, título, observação).
const temCpf = (t: string | null) => !t || !/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/.test(t);
const MSG_CPF = "Não escreva CPF aqui.";

const anoMax = () => new Date().getFullYear() + 1;
const orgao = z.enum(["prefeitura", "camara"], { error: "Escolha Prefeitura ou Câmara." });

export const esquemaDocumento = z
  .object({
    tipo: z.enum(["licitacao", "contrato", "outro"], { error: "Escolha o tipo." }),
    modalidade: z.preprocess(vazioParaNulo, z.enum(Object.keys(MODALIDADES) as [string, ...string[]]).nullable()),
    numero: z.string().trim().min(1, "Informe o número do processo.").max(30, "No máximo 30 caracteres."),
    ano: z.coerce.number().int().min(1950, "Ano inválido.").max(anoMax(), "Ano inválido."),
    titulo_processo: z.preprocess(vazioParaNulo, z.string().trim().min(2, "Mínimo de 2 caracteres.").max(200, "No máximo 200 caracteres.").refine(temCpf, MSG_CPF).nullable()),
    objeto: z.string().trim().min(3, "Descreva o objeto.").max(2000, "No máximo 2.000 caracteres.").refine(temCpf, MSG_CPF),
    // Prefeitura ou Câmara: o cadastro escolhe (documento da Câmara pode ir para caixa da Prefeitura).
    orgao,
    secretaria: uuid,
    caixa: uuid,
    // Classificação: a classe define o grupo e o prazo; tipologia é opcional.
    classe: uuid,
    tipologia: z.preprocess(vazioParaNulo, uuid.nullable()),
    observacao: z.preprocess(vazioParaNulo, z.string().trim().max(300, "No máximo 300 caracteres.").refine(temCpf, MSG_CPF).nullable()),
    volume: z.preprocess((v) => (v === "" || v === undefined ? 1 : v), z.coerce.number().int("Volume inválido.").min(1, "Volume inválido.").max(99, "Volume inválido.")),
  })
  .superRefine((d, ctx) => {
    const erro = (path: string, message: string) => ctx.addIssue({ code: "custom", path: [path], message });
    if (d.tipo === "licitacao" && !d.modalidade) erro("modalidade", "Escolha a modalidade.");
    if (d.tipo !== "licitacao" && d.modalidade) erro("modalidade", "Modalidade é só de licitação.");
  });
export type DadosDocumento = z.infer<typeof esquemaDocumento>;

export const esquemaId = z.object({ id: uuid });

// Código da classificação (tabela de temporalidade): ao escolhê-lo o app busca classe, tipologia e prazo.
export const esquemaCodigoClasse = z.string().trim().regex(/^[0-9A-Za-z.-]{1,20}$/, "Código inválido.");

const textoCurto = (max: number) => z.preprocess(vazioParaNulo, z.string().trim().min(2, "Mínimo de 2 caracteres.").max(max, `No máximo ${max} caracteres.`).nullable());
const caixaMeses = z.preprocess(
  (v) => (Array.isArray(v) ? v : typeof v === "string" && v.trim() ? v.split(",") : []),
  z.array(z.coerce.number().int("Mês inválido.").min(1, "Mês inválido.").max(12, "Mês inválido.")).max(12).transform((m) => [...new Set(m)].sort((a, b) => a - b)),
);
const marcado = z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean());

// Cadastro da caixa: geral (arquivo geral, sem listar o conteúdo) ou detalhada (licitações e contratos).
// O número da caixa não vem daqui: o banco gera em sequência, uma sequência por órgão.
export const esquemaCaixa = z.object({
  id: uuid,
  orgao,
  tipo: z.enum(["geral", "detalhada"], { error: "Escolha o tipo da caixa." }),
  fundo: textoCurto(120),
  setor: textoCurto(120),
  meses: caixaMeses,
  ano_limite: z.preprocess(vazioParaNulo, z.coerce.number().int("Ano inválido.").min(1900, "Ano inválido.").max(anoMax(), "Ano inválido.").nullable()),
  digitalizada: marcado,
  observacao: z.preprocess(vazioParaNulo, z.string().trim().max(500, "No máximo 500 caracteres.").refine(temCpf, MSG_CPF).nullable()),
  codigo_classificacao: z.preprocess(vazioParaNulo, esquemaCodigoClasse.nullable()),
  // Preenchidos a partir do código (classe_por_codigo); a caixa geral guarda os três no próprio registro.
  classe: z.preprocess(vazioParaNulo, uuid.nullable()),
  tipologia: z.preprocess(vazioParaNulo, uuid.nullable()),
  prazo_anos: z.preprocess(vazioParaNulo, z.coerce.number().int("Prazo inválido.").min(0, "Prazo inválido.").max(99, "Prazo inválido.").nullable()),
  // Etiqueta geral da caixa, sem listar itens (também para caixa detalhada).
  etiqueta_geral: marcado,
});
export type DadosCaixa = z.infer<typeof esquemaCaixa>;

export const esquemaEnvio = z.object({
  documento: uuid,
  nome: z
    .string()
    .transform((n) => n.replace(/[\u0000-\u001f\u007f\/]/g, "").trim())
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
    case "LC008":
      return "Esta caixa é do arquivo geral e não lista documentos. Escolha uma caixa detalhada.";
    case "42501":
      return "Você não tem permissão para esta ação.";
    case "23503":
      return "A caixa, a secretaria ou a classe escolhida não é válida.";
    case "23502":
      return "Escolha o grupo, a classe e o órgão do documento.";
    default:
      return "Não foi possível salvar. Tente de novo.";
  }
}
