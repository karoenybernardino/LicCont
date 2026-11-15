import { exigirAdmin } from "@/features/sessao/dal";
import { clienteSessao } from "@/lib/supabase/servidor";
import { emDemo } from "@/features/demo/dados";
import { gerarExportacao } from "@/features/exportacao/dados";

// Exportação completa da prefeitura. Só administrador; registra na auditoria
// só contagens. O nome do arquivo não carrega nada do conteúdo.
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET() {
  await exigirAdmin();
  if (emDemo()) return new Response("Modo demonstração: nada foi gerado.", { status: 200 });
  let r;
  try {
    r = await gerarExportacao();
  } catch {
    return new Response("Não foi possível gerar a exportação.", { status: 500 });
  }
  const sb = await clienteSessao();
  const { error } = sb
    ? await sb.rpc("registrar_exportacao", { p_documentos: r.documentos, p_pdfs: r.pdfs, p_pdfs_fora: r.fora })
    : { error: true };
  // Sem registro na auditoria não há download.
  if (error) return new Response("Não foi possível gerar a exportação.", { status: 500 });
  const dia = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  return new Response(r.zip as BodyInit, {
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename="exportacao-liccont-${dia}.zip"`,
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
