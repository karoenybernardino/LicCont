import "server-only";
import { clienteServico, clienteSessao } from "@/lib/supabase/servidor";
import { PREFEITURAS_DEMO, USUARIOS_DEMO, emDemo } from "@/features/demo/dados";
import type { PrefeituraLista } from "./lista";

export type { PrefeituraLista } from "./lista";
export type Administrador = { id: string; nome: string; email: string; ativo: boolean };

const DATA_DEMO = "2026-11-08T12:00:00Z";
const adminsDemo = (): Administrador[] =>
  USUARIOS_DEMO.filter((u) => u.perfil === "administrador").map(({ id, nome, email, ativo }) => ({ id, nome, email, ativo }));

// Leitura pela sessão da equipe (RLS: app.eh_equipe()). A contagem de
// administradores vem do servidor (service_role), só números por prefeitura.
export async function listarPrefeituras(): Promise<PrefeituraLista[]> {
  if (emDemo()) return PREFEITURAS_DEMO.map((p, i) => ({ ...p, criadoEm: DATA_DEMO, administradores: i === 0 ? adminsDemo().length : 0 }));
  const supabase = await clienteSessao();
  if (!supabase) return [];
  const { data } = await supabase.from("prefeituras").select("id, nome, cnpj, status, criado_em").order("nome");
  const servico = clienteServico();
  const { data: admins } = servico
    ? await servico.from("usuarios").select("prefeitura_id").eq("administrador", true).eq("ativo", true)
    : { data: [] as { prefeitura_id: string }[] };
  const total = new Map<string, number>();
  for (const a of admins ?? []) total.set(a.prefeitura_id, (total.get(a.prefeitura_id) ?? 0) + 1);
  return (data ?? []).map((p) => ({
    id: p.id, nome: p.nome, cnpj: p.cnpj, status: p.status, criadoEm: p.criado_em, administradores: total.get(p.id) ?? 0,
  })) as PrefeituraLista[];
}

export async function obterPrefeitura(id: string) {
  return (await listarPrefeituras()).find((p) => p.id === id) ?? null;
}

// Administradores de uma prefeitura (nome e e-mail só para a equipe, na tela).
export async function listarAdministradores(prefeituraId: string): Promise<Administrador[]> {
  if (emDemo()) return prefeituraId === PREFEITURAS_DEMO[0].id ? adminsDemo() : [];
  const servico = clienteServico();
  if (!servico) return [];
  const { data } = await servico
    .from("usuarios")
    .select("id, nome, ativo")
    .eq("prefeitura_id", prefeituraId)
    .eq("administrador", true)
    .order("nome");
  const contas = await Promise.all((data ?? []).map((u) => servico.auth.admin.getUserById(u.id)));
  return (data ?? []).map((u, i) => ({ id: u.id, nome: u.nome, email: contas[i].data.user?.email ?? "", ativo: u.ativo }));
}
