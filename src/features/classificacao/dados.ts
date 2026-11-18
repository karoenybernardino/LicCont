import "server-only";
import { clienteSessao } from "@/lib/supabase/servidor";
import { emDemo } from "@/features/demo/dados";
import { GRUPOS_DEMO, TIPOLOGIAS_DEMO, type GrupoDoc, type TipologiaDoc } from "@/features/demo/classificacao";

export type { GrupoDoc, TipologiaDoc } from "@/features/demo/classificacao";
export const GRUPO_LICITACOES = "licitacoes_contratos";

// Grupos e tipologias que a pessoa pode ver (o RLS já tira os grupos restritos de quem não tem acesso).
export async function listarGrupos(): Promise<GrupoDoc[]> {
  if (emDemo()) return GRUPOS_DEMO;
  const sb = await clienteSessao();
  if (!sb) return [];
  const { data } = await sb.from("grupos_documentais").select("id, chave, nome, restrito, ativo").order("nome");
  return (data ?? []) as GrupoDoc[];
}

export async function listarTipologias(): Promise<(TipologiaDoc & { ativa: boolean })[]> {
  if (emDemo()) return TIPOLOGIAS_DEMO.map((t) => ({ ...t, ativa: true }));
  const sb = await clienteSessao();
  if (!sb) return [];
  const { data } = await sb.from("tipologias").select("id, grupo_id, nome, ativa").order("nome");
  return (data ?? []).map((t) => ({ id: t.id as string, grupoId: t.grupo_id as string, nome: t.nome as string, ativa: t.ativa as boolean }));
}

// Papéis liberados em cada grupo restrito (só o administrador lê).
export async function papeisPorGrupo(): Promise<Record<string, string[]>> {
  if (emDemo()) return {};
  const sb = await clienteSessao();
  if (!sb) return {};
  const { data } = await sb.from("grupo_papeis").select("grupo_id, papel");
  const r: Record<string, string[]> = {};
  for (const x of data ?? []) (r[x.grupo_id as string] ??= []).push(x.papel as string);
  return r;
}
