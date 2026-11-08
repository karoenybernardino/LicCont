import "server-only";
import { clientePublico } from "@/lib/supabase/servidor";
import { PREFEITURAS_DEMO, SECRETARIAS_DEMO, emDemo } from "@/features/demo/dados";

export type Item = { id: string; nome: string };

// Listas das telas de login. null = login indisponível (sem banco).
export async function prefeiturasParaLogin(): Promise<Item[] | null> {
  if (emDemo()) return PREFEITURAS_DEMO.filter((p) => p.status === "ativa").map(({ id, nome }) => ({ id, nome }));
  const publico = clientePublico();
  if (!publico) return null;
  const { data } = await publico.rpc("prefeituras_para_login");
  return (data ?? []) as Item[];
}

export async function secretariasParaLogin(prefeitura: string): Promise<Item[]> {
  if (emDemo()) return SECRETARIAS_DEMO.filter((s) => s.ativa).map(({ id, nome }) => ({ id, nome }));
  const publico = clientePublico();
  if (!publico) return [];
  const { data } = await publico.rpc("secretarias_para_login", { p_prefeitura: prefeitura });
  return (data ?? []) as Item[];
}
