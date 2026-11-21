"use server";

import { revalidatePath } from "next/cache";
import { PDFDocument } from "pdf-lib";
import { z } from "zod";
import { clienteSessao } from "@/lib/supabase/servidor";
import { exigirSessao } from "@/features/sessao/dal";
import { MENSAGEM_INDISPONIVEL } from "@/features/login/esquemas";
import { AVISO_DEMO, emDemo } from "@/features/demo/dados";
import { limitePdfMb, secretariasParaCadastro } from "@/features/documentos/dados";
import { conferirEnvio, iniciarEnvio } from "@/features/documentos/acoes";
import { ErroPncp, MENSAGEM_PNCP, baixarArquivo, esquemaCompra, listarArquivos, type ArquivoPncp } from "./cliente";

// Quem cadastra na secretaria do documento busca e anexa. O PDF baixado passa
// pela mesma conferência dos envios feitos pelo navegador (tamanho, assinatura,
// hash e cópia leve). Nada do documento do LicCONT vai ao PNCP, e nome de
// arquivo e conteúdo nunca vão para log.

export type RetornoPncp = { erro?: string; aviso?: string; arquivos?: ArquivoPncp[] };
const SEM_PERMISSAO: RetornoPncp = { erro: "Você não tem permissão para esta ação." };
const uuid = z.guid();

async function podeAnexar(documento: string) {
  const { usuario } = await exigirSessao();
  const permitidas = new Set((await secretariasParaCadastro(usuario)).map((s) => s.id));
  if (emDemo()) return { usuario, ok: permitidas.size > 0, secretaria: null as string | null };
  const sb = await clienteSessao();
  const { data } = sb ? await sb.from("documentos").select("secretaria_id").eq("id", documento).eq("ativo", true).maybeSingle() : { data: null };
  return { usuario, ok: !!data && permitidas.has(data.secretaria_id as string), secretaria: (data?.secretaria_id as string | undefined) ?? null };
}

export async function buscarArquivosPncp(entrada: unknown): Promise<RetornoPncp> {
  const dados = z.object({ documento: uuid, compra: esquemaCompra }).safeParse(entrada);
  if (!dados.success) return { erro: dados.error.issues[0]?.message ?? "Confira os dados e tente de novo." };
  const { ok } = await podeAnexar(dados.data.documento);
  if (!ok) return SEM_PERMISSAO;
  if (emDemo()) return { aviso: AVISO_DEMO, arquivos: [{ sequencial: 1, titulo: "Edital de exemplo.pdf", tipo: "Edital" }] };
  try {
    const arquivos = await listarArquivos(dados.data.compra);
    return arquivos.length ? { arquivos } : { erro: "Esta compra não tem arquivos publicados." };
  } catch (e) {
    return { erro: MENSAGEM_PNCP[e instanceof ErroPncp ? e.codigo : "indisponivel"] };
  }
}

export async function anexarDoPncp(entrada: unknown): Promise<RetornoPncp> {
  const dados = z
    .object({ documento: uuid, compra: esquemaCompra, sequencial: z.coerce.number().int().min(1).max(9999), nome: z.string().max(200) })
    .safeParse(entrada);
  if (!dados.success) return { erro: "Confira os dados e tente de novo." };
  const { usuario, ok } = await podeAnexar(dados.data.documento);
  if (!ok) return SEM_PERMISSAO;
  if (emDemo()) return { aviso: AVISO_DEMO };
  const sb = await clienteSessao();
  if (!sb) return { erro: MENSAGEM_INDISPONIVEL };

  const limite = (await limitePdfMb(usuario)) * 1024 * 1024;

  let bytes: Uint8Array;
  let paginas: number;
  try {
    bytes = await baixarArquivo(dados.data.compra, dados.data.sequencial, limite);
    paginas = (await PDFDocument.load(bytes)).getPageCount();
  } catch (e) {
    return { erro: MENSAGEM_PNCP[e instanceof ErroPncp ? e.codigo : "nao_pdf"] };
  }

  const nome = (dados.data.nome.replace(/[\u0000-\u001f\u007f\\/]/g, "").trim() || "arquivo-pncp").replace(/(\.pdf)?$/i, ".pdf");
  const envio = await iniciarEnvio({ documento: dados.data.documento, nome, tamanho: bytes.length, miniatura: false });
  if ("erro" in envio) return { erro: envio.erro };
  const form = new FormData();
  form.append("cacheControl", "3600");
  form.append("", new Blob([bytes as BlobPart], { type: "application/pdf" }));
  const subida = await fetch(envio.urlPdf, { method: "PUT", headers: { "x-upsert": "false" }, body: form }).catch(() => null);
  if (!subida?.ok) return { erro: MENSAGEM_INDISPONIVEL };

  const r = await conferirEnvio({ arquivo: envio.arquivoId, paginas: Math.min(paginas, 100000), avisos: [], miniatura: false });
  if (!r.ok) return { erro: r.erro };
  revalidatePath("/pesquisa");
  revalidatePath(`/documentos/${dados.data.documento}`);
  return { aviso: "PDF anexado ao documento." };
}
