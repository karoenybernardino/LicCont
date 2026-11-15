import { z } from "zod";

// Cliente do Portal Nacional de Contratações Públicas (PNCP), só no servidor.
// Os arquivos são públicos. Nada do documento do LicCONT vai ao PNCP: só o
// CNPJ do órgão, o ano e o número da compra, que a pessoa confere na tela.
//
// ATENÇÃO: caminho e campos seguem a API pública de consulta do PNCP; confirme
// contra a resposta real antes do uso em produção (tudo que muda está aqui).

export const BASE_PNCP = "https://pncp.gov.br/pncp-api/v1";
export const LIMITE_LISTA = 50;

export class ErroPncp extends Error {
  constructor(readonly codigo: "indisponivel" | "nao_encontrado" | "formato" | "grande_demais" | "nao_pdf") {
    super(codigo);
    this.name = "ErroPncp";
  }
}

export const esquemaCompra = z.object({
  cnpj: z.string().transform((v) => v.replace(/\D/g, "")).pipe(z.string().regex(/^\d{14}$/, "CNPJ do órgão inválido.")),
  ano: z.coerce.number().int().min(2000, "Ano inválido.").max(2100, "Ano inválido."),
  sequencial: z.coerce.number().int().min(1, "Número da compra inválido.").max(999999, "Número da compra inválido."),
});
export type Compra = z.infer<typeof esquemaCompra>;

export type ArquivoPncp = { sequencial: number; titulo: string; tipo: string };

const item = z
  .object({
    sequencialDocumento: z.coerce.number().int().min(1),
    titulo: z.string().nullish(),
    tipoDocumentoNome: z.string().nullish(),
  })
  .loose();

export type Dependencias = { buscar?: typeof fetch; base?: string };

const caminho = (c: Compra, base: string) => `${base}/orgaos/${c.cnpj}/compras/${c.ano}/${c.sequencial}/arquivos`;

export async function listarArquivos(compra: Compra, dep: Dependencias = {}): Promise<ArquivoPncp[]> {
  const buscar = dep.buscar ?? fetch;
  let resp: Response;
  try {
    resp = await buscar(caminho(compra, dep.base ?? BASE_PNCP), { headers: { accept: "application/json" }, signal: AbortSignal.timeout(20_000) });
  } catch {
    throw new ErroPncp("indisponivel");
  }
  if (resp.status === 404) throw new ErroPncp("nao_encontrado");
  if (!resp.ok) throw new ErroPncp("indisponivel");
  const corpo = z.array(item).safeParse(await resp.json().catch(() => null));
  if (!corpo.success) throw new ErroPncp("formato");
  return corpo.data.slice(0, LIMITE_LISTA).map((a) => ({
    sequencial: a.sequencialDocumento,
    titulo: (a.titulo ?? `Arquivo ${a.sequencialDocumento}`).slice(0, 200),
    tipo: (a.tipoDocumentoNome ?? "").slice(0, 60),
  }));
}

// Baixa um arquivo, recusa se passar do limite e confere a assinatura %PDF.
export async function baixarArquivo(compra: Compra, sequencial: number, limiteBytes: number, dep: Dependencias = {}): Promise<Uint8Array> {
  const buscar = dep.buscar ?? fetch;
  if (!Number.isInteger(sequencial) || sequencial < 1) throw new ErroPncp("formato");
  let resp: Response;
  try {
    resp = await buscar(`${caminho(compra, dep.base ?? BASE_PNCP)}/${sequencial}`, { signal: AbortSignal.timeout(60_000) });
  } catch {
    throw new ErroPncp("indisponivel");
  }
  if (resp.status === 404) throw new ErroPncp("nao_encontrado");
  if (!resp.ok || !resp.body) throw new ErroPncp("indisponivel");
  const declarado = Number(resp.headers.get("content-length") ?? 0);
  if (declarado > limiteBytes) throw new ErroPncp("grande_demais");
  const partes: Uint8Array[] = [];
  let total = 0;
  const leitor = resp.body.getReader();
  for (;;) {
    const { done, value } = await leitor.read();
    if (done) break;
    total += value.length;
    if (total > limiteBytes) {
      await leitor.cancel();
      throw new ErroPncp("grande_demais");
    }
    partes.push(value);
  }
  const bytes = new Uint8Array(total);
  let pos = 0;
  for (const p of partes) {
    bytes.set(p, pos);
    pos += p.length;
  }
  if (!(bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46)) throw new ErroPncp("nao_pdf");
  return bytes;
}

export const MENSAGEM_PNCP: Record<ErroPncp["codigo"], string> = {
  indisponivel: "O PNCP está fora do ar. Tente mais tarde.",
  nao_encontrado: "Não achamos esta compra no PNCP. Confira o CNPJ, o ano e o número.",
  formato: "O PNCP respondeu de um jeito que o sistema não reconhece.",
  grande_demais: "O arquivo passa do limite de tamanho da prefeitura.",
  nao_pdf: "O arquivo escolhido não é um PDF.",
};
