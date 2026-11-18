import { notFound, redirect } from "next/navigation";
import { clienteSessao } from "@/lib/supabase/servidor";
import { exigirSessao } from "@/features/sessao/dal";
import { emDemo } from "@/features/demo/dados";

export const dynamic = "force-dynamic";

// Destino do QR das etiquetas: /q/<código aleatório de 32 caracteres>. Exige login e passa pelo RLS,
// então quem não pode ver a caixa ou o documento (outra prefeitura, grupo restrito) cai em "não
// encontrado". O QR nunca leva o id do banco.
export default async function Qr({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  if (!/^[0-9a-f]{32}$/.test(codigo)) notFound();
  await exigirSessao();
  if (emDemo()) notFound();
  const sb = await clienteSessao();
  if (!sb) notFound();
  const caixa = await sb.from("etiquetas").select("caixa_id").eq("codigo", codigo).maybeSingle();
  if (caixa.data) redirect(`/mapa?caixa=${caixa.data.caixa_id}`);
  const doc = await sb.from("documentos").select("id").eq("qr_codigo", codigo).maybeSingle();
  if (doc.data) redirect(`/documentos/${doc.data.id}`);
  notFound();
}
