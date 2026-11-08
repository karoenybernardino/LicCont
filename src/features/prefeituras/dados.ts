import "server-only";
import { clienteSessao } from "@/lib/supabase/servidor";
import { PREFEITURAS_DEMO, emDemo } from "@/features/demo/dados";

export type PrefeituraLista = { id: string; nome: string; cnpj: string; status: "implantacao" | "ativa" | "suspensa" };

// Leitura pela sessão da equipe (RLS: app.eh_equipe()).
export async function listarPrefeituras(): Promise<PrefeituraLista[]> {
  if (emDemo()) return PREFEITURAS_DEMO.map((p) => ({ ...p }));
  const supabase = await clienteSessao();
  if (!supabase) return [];
  const { data } = await supabase.from("prefeituras").select("id, nome, cnpj, status").order("nome");
  return (data ?? []) as PrefeituraLista[];
}
