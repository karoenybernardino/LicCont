import { exigirEquipe } from "@/features/sessao/dal";
import { historicoTce } from "@/features/equipe/dados";
import { historicoParaCsv } from "@/features/equipe/exportar";

// Histórico das rodadas do TCE-CE: só números, datas e erro em texto fixo.
export const dynamic = "force-dynamic";

export async function GET() {
  await exigirEquipe();
  return new Response(historicoParaCsv(await historicoTce()), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="historico-tce-${new Date().toISOString().slice(0, 10)}.csv"`,
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
