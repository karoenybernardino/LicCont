"use server";

import { redirect } from "next/navigation";
import { clienteSessao } from "@/lib/supabase/servidor";
import { AVISO_DEMO, emDemo } from "@/features/demo/dados";
import { usuarioDePrefeitura } from "@/features/sessao/dal";
import { VERSAO_TEXTOS } from "@/features/site/versao";
import type { EstadoAcao } from "@/ui/formulario";

export async function aceitarTextos(_: EstadoAcao, dados: FormData): Promise<EstadoAcao> {
  if (emDemo()) return { aviso: AVISO_DEMO };
  if (!(await usuarioDePrefeitura())) redirect("/entrar");
  if (dados.get("aceito") !== "on") return { erro: "Marque a caixa para continuar." };
  const sb = await clienteSessao();
  if (!sb) return { erro: "Não foi possível registrar agora. Tente de novo." };
  const { error } = await sb.rpc("registrar_aceite", { p_versao: VERSAO_TEXTOS });
  if (error) return { erro: "Não foi possível registrar agora. Tente de novo." };
  redirect("/inicio");
}
