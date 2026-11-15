import { exigirSessao } from "@/features/sessao/dal";
import { esquemaId } from "@/features/documentos/esquemas";
import { obterTermo } from "@/features/temporalidade/dados";
import { conteudoTermo } from "@/features/temporalidade/termo";
import { gerarPdf } from "@/features/temporalidade/pdf";
import { gerarWord } from "@/features/temporalidade/word";

// PDF ou Word do termo. O RLS só devolve o termo a quem enxerga a secretaria;
// sem login, exigirSessao manda para a entrada. Nada em cache e sem dado em log.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const formato = new URL(req.url).searchParams.get("formato");
  if (!esquemaId.safeParse({ id }).success || (formato !== "pdf" && formato !== "docx")) return new Response("Não encontrado", { status: 404 });
  await exigirSessao();
  const termo = await obterTermo(id);
  if (!termo) return new Response("Não encontrado", { status: 404 });
  const c = conteudoTermo(termo);
  const cabecalhos = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
  if (formato === "pdf") {
    return new Response(Buffer.from(await gerarPdf(c)), {
      headers: { ...cabecalhos, "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${c.arquivo}.pdf"` },
    });
  }
  return new Response(new Uint8Array(await gerarWord(c)), {
    headers: {
      ...cabecalhos,
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${c.arquivo}.docx"`,
    },
  });
}
