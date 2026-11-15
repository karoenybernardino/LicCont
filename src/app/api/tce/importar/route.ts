import { timingSafeEqual } from "node:crypto";
import { clienteServico } from "@/lib/supabase/servidor";
import { importarTodas } from "@/features/tce/rotina";

// Importação noturna do TCE-CE (agendada em vercel.json, região gru1: a API do
// TCE só aceita IP do Brasil). Só roda com o CRON_SECRET da Vercel. Resposta só
// com contagens: nada de nome, objeto, CNPJ ou erro cru.
export const dynamic = "force-dynamic";
export const maxDuration = 300;

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
  if (!servico) return Response.json({ prefeituras: 0, motivo: "indisponivel" }, { status: 503 });
  const r = await importarTodas(servico);
  return Response.json({
    prefeituras: r.length,
    novos: r.reduce((s, x) => s + x.novos, 0),
    duplicados: r.reduce((s, x) => s + x.duplicados, 0),
    comErro: r.filter((x) => x.erro).length,
  });
}
