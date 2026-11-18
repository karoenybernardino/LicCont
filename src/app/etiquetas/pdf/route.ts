import { NextResponse } from "next/server";
import { z } from "zod";
import { clienteSessao } from "@/lib/supabase/servidor";
import { usuarioAtual } from "@/features/sessao/dal";
import { podeCadastrar } from "@/features/documentos/dados";
import { emDemo } from "@/features/demo/dados";
import { MAX_ETIQUETAS, TIPOS_ETIQUETA, montarEtiquetas } from "@/features/etiquetas/montar";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const entrada = z.object({
  tipos: z.array(z.enum(TIPOS_ETIQUETA as [string, ...string[]])).min(1).max(3),
  caixas: z.array(z.guid()).max(MAX_ETIQUETAS).default([]),
  documentos: z.array(z.guid()).max(MAX_ETIQUETAS).default([]),
});
const NOMES: Record<string, string> = { caixa: "etiquetas-das-caixas", conteudo: "folhas-de-conteudo", documento: "etiquetas-dos-documentos" };

// POST /etiquetas/pdf  { tipos, caixas, documentos } -> application/pdf
// POST e não GET: a lista de ids de um lote grande não cabe na URL. Gera o PDF do que foi escolhido e
// registra quem imprimiu e quando (auditoria). Exige login e papel de cadastro; o RLS e os grupos
// documentais valem como em qualquer leitura.
export async function POST(req: Request) {
  const u = await usuarioAtual();
  if (!u) return new NextResponse("Entre para continuar.", { status: 401 });
  if (!(await podeCadastrar(u))) return new NextResponse("Você não tem permissão para esta ação.", { status: 403 });
  const dados = entrada.safeParse(await req.json().catch(() => null));
  if (!dados.success || (!dados.data.caixas.length && !dados.data.documentos.length)) return new NextResponse("Escolha o que imprimir.", { status: 400 });
  const { tipos, caixas, documentos } = dados.data;
  try {
    const r = await montarEtiquetas({ tipos: tipos as (typeof TIPOS_ETIQUETA)[number][], caixas, documentos, prefeitura: u.prefeituraId });
    if (!r.total) return new NextResponse("Nada para imprimir com essa escolha.", { status: 404 });
    if (!emDemo()) {
      const sb = await clienteSessao();
      await sb?.rpc("registrar_impressoes", { p_itens: r.impressoes });
    }
    return new NextResponse(r.pdf as BodyInit, {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="${tipos.length === 1 ? NOMES[tipos[0]] : "etiquetas"}.pdf"`,
        "cache-control": "no-store",
      },
    });
  } catch {
    return new NextResponse("Não foi possível gerar o PDF. Tente de novo.", { status: 500 });
  }
}
