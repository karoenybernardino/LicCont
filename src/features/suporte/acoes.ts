"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { clienteSessao } from "@/lib/supabase/servidor";
import { AVISO_DEMO, emDemo } from "@/features/demo/dados";
import { exigirAdmin } from "@/features/sessao/dal";
import type { EstadoAcao } from "@/ui/formulario";

const FALHA = "Não foi possível concluir agora. Confira os dados e tente de novo.";
const esquema = z.object({
  motivo: z.string().trim().min(5, "Explique o motivo em poucas palavras.").max(300),
  horas: z.coerce.number().int().min(1).max(5),
});

export async function autorizarSuporte(_: EstadoAcao, dados: FormData): Promise<EstadoAcao> {
  await exigirAdmin();
  if (emDemo()) return { aviso: AVISO_DEMO };
  const r = esquema.safeParse({ motivo: dados.get("motivo"), horas: dados.get("horas") });
  if (!r.success) return { erro: r.error.issues[0]?.message ?? FALHA };
  const sb = await clienteSessao();
  if (!sb) return { erro: FALHA };
  const { error } = await sb.rpc("autorizar_suporte", { p_motivo: r.data.motivo, p_horas: r.data.horas });
  if (error) return { erro: FALHA };
  revalidatePath("/configuracoes/suporte");
  return { aviso: `Acesso de suporte autorizado por ${r.data.horas} h.` };
}

export async function revogarSuporte(_: EstadoAcao, dados: FormData): Promise<EstadoAcao> {
  await exigirAdmin();
  if (emDemo()) return { aviso: AVISO_DEMO };
  const id = z.uuid().safeParse(dados.get("id"));
  const sb = await clienteSessao();
  if (!id.success || !sb) return { erro: FALHA };
  const { error } = await sb.rpc("revogar_suporte", { p_id: id.data });
  if (error) return { erro: FALHA };
  revalidatePath("/configuracoes/suporte");
  return { aviso: "Autorização revogada." };
}
