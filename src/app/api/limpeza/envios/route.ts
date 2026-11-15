import { timingSafeEqual } from "node:crypto";
import { clienteServico } from "@/lib/supabase/servidor";

// Limpeza diária de PDF abandonado (agendada em vercel.json). Só roda com o
// segredo CRON_SECRET da Vercel; sem ele a rotina fica desligada. Resposta só
// com a contagem: nada de caminho, nome de arquivo ou pessoa.
export const dynamic = "force-dynamic";

function autorizado(req: Request) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo) return false;
  const a = Buffer.from(req.headers.get("authorization") ?? "");
  const b = Buffer.from(`Bearer ${segredo}`);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(req: Request) {
  if (!autorizado(req)) return new Response("Não encontrado", { status: 404 });
  const servico = clienteServico();
  if (!servico) return Response.json({ limpos: 0, motivo: "indisponivel" }, { status: 503 });
  const { data, error } = await servico.rpc("limpar_envios_todos");
  if (error) return Response.json({ limpos: 0, motivo: "falha" }, { status: 500 });
  const velhos = (data ?? []) as { caminho: string; miniatura: string }[];
  if (velhos.length) {
    await servico.storage.from("acervo").remove(velhos.map((v) => v.caminho));
    await servico.storage.from("miniaturas").remove(velhos.map((v) => v.miniatura));
  }
  return Response.json({ limpos: velhos.length });
}
