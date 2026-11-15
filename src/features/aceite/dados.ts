import "server-only";
import { cache } from "react";
import { clienteSessao } from "@/lib/supabase/servidor";
import { emDemo } from "@/features/demo/dados";
import { VERSAO_TEXTOS } from "@/features/site/versao";

// A pessoa já aceitou a política e o termo na versão em vigor? Erro ao ler conta como "não".
export const aceiteEmDia = cache(async (): Promise<boolean> => {
  if (emDemo()) return true;
  const sb = await clienteSessao();
  if (!sb) return false;
  const { data, error } = await sb.from("aceites").select("documento").eq("versao", VERSAO_TEXTOS);
  if (error) return false;
  const tem = new Set((data ?? []).map((a) => a.documento));
  return tem.has("privacidade") && tem.has("termos");
});
