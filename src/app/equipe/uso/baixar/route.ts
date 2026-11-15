import { exigirEquipe } from "@/features/sessao/dal";
import { listarPrefeituras, recusadosNoMes, usoPrefeituras } from "@/features/prefeituras/dados";
import { usoParaCsv } from "@/features/prefeituras/uso";

// Planilha do uso do mês: só contagens por prefeitura.
export const dynamic = "force-dynamic";

export async function GET() {
  await exigirEquipe();
  const [prefeituras, uso, recusados] = await Promise.all([listarPrefeituras(), usoPrefeituras(), recusadosNoMes()]);
  const csv = usoParaCsv(prefeituras.map((p) => ({ nome: p.nome, status: p.status, uso: uso.get(p.id) })), recusados);
  const mes = new Date().toISOString().slice(0, 7);
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="uso-liccont-${mes}.csv"`,
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
