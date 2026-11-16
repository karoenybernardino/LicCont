import { emDemo } from "@/features/demo/dados";
import { conferirSaude } from "@/lib/saude";
import { clienteServico } from "@/lib/supabase/servidor";

// Saúde para a checagem externa (docs/seguranca/monitoramento.md). Pública e sem
// detalhe: só "ok" ou "falha" do banco e do Storage.
export const dynamic = "force-dynamic";

export async function GET() {
  const cabecalhos = { "cache-control": "no-store" };
  if (emDemo()) return Response.json({ status: "ok", modo: "demonstracao" }, { headers: cabecalhos });
  const servico = clienteServico();
  const r = await conferirSaude({
    banco: async () => {
      if (!servico) return false;
      const { data, error } = await servico.rpc("saude");
      return !error && data === true;
    },
    storage: async () => {
      if (!servico) return false;
      const { error } = await servico.storage.getBucket("acervo");
      return !error;
    },
  });
  return Response.json(r, { status: r.status === "ok" ? 200 : 503, headers: cabecalhos });
}
