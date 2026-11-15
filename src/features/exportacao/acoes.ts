"use server";

import { exigirAdmin } from "@/features/sessao/dal";
import { clienteSessao } from "@/lib/supabase/servidor";
import { AVISO_DEMO, emDemo } from "@/features/demo/dados";
import { gerarExportacao } from "./dados";

export type EstadoExportacao = { erro?: string; aviso?: string; links?: { rotulo: string; url: string }[] } | undefined;

const FALHA = "Não foi possível gerar a exportação.";
const VALIDADE_LINK_S = 300;

// Exportação completa da prefeitura, disparada por POST (Server Action). Só
// administrador. O ZIP vai para o bucket privado "exportacoes", na pasta da
// prefeitura, e volta por link assinado de 5 minutos; a exportação anterior é
// apagada e o cron remove o que sobrar. A auditoria guarda só contagens.
export async function exportarDados(): Promise<EstadoExportacao> {
  const { usuario } = await exigirAdmin();
  if (emDemo()) return { aviso: AVISO_DEMO };
  const sb = await clienteSessao();
  if (!sb) return { erro: FALHA };
  let r;
  try {
    r = await gerarExportacao();
  } catch {
    return { erro: FALHA };
  }
  // Sem registro na auditoria não há download.
  const { error: eAud } = await sb.rpc("registrar_exportacao", { p_documentos: r.documentos, p_pdfs: r.pdfs, p_pdfs_fora: r.fora });
  if (eAud) return { erro: FALHA };

  const pasta = usuario.prefeituraId;
  const bucket = sb.storage.from("exportacoes");
  const { data: antigos } = await bucket.list(pasta);
  if (antigos?.length) await bucket.remove(antigos.map((o) => `${pasta}/${o.name}`));

  const dia = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const links: { rotulo: string; url: string }[] = [];
  const caminhos: string[] = [];
  for (const [i, bytes] of r.volumes.entries()) {
    const nome = `exportacao-liccont-${dia}-${i === 0 ? "planilhas" : `pdfs-${i}`}.zip`;
    const caminho = `${pasta}/${crypto.randomUUID()}.zip`;
    const { error } = await bucket.upload(caminho, bytes, { contentType: "application/zip", upsert: false });
    if (error) {
      await bucket.remove(caminhos);
      return { erro: FALHA };
    }
    caminhos.push(caminho);
    const { data, error: eLink } = await bucket.createSignedUrl(caminho, VALIDADE_LINK_S, { download: nome });
    if (eLink || !data) {
      await bucket.remove(caminhos);
      return { erro: FALHA };
    }
    links.push({ rotulo: i === 0 ? "Planilhas e conferência" : `PDFs, parte ${i}`, url: data.signedUrl });
  }
  return { aviso: "Pacote pronto. Os links valem 5 minutos.", links };
}
