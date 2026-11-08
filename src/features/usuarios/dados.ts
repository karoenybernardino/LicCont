import "server-only";
import { clienteServico, clienteSessao } from "@/lib/supabase/servidor";
import type { Perfil } from "./esquemas";

export type UsuarioLista = {
  id: string;
  nome: string;
  matricula: string | null;
  email: string;
  perfil: Perfil;
  ativo: boolean;
  trocaSenha: boolean;
  secretarias: string[];
};

// Leitura pela sessão do administrador (RLS: só a própria prefeitura, com aal2).
// O e-mail fica só no Supabase Auth: vem pela service_role, filtrado pelos ids
// que o RLS devolveu.
export async function listarUsuarios(id?: string): Promise<UsuarioLista[]> {
  const supabase = await clienteSessao();
  const servico = clienteServico();
  if (!supabase || !servico) return [];

  let consulta = supabase
    .from("usuarios")
    .select("id, nome, matricula, administrador, ativo, troca_senha_obrigatoria")
    .order("nome");
  if (id) consulta = consulta.eq("id", id);
  const [{ data: usuarios }, { data: vinculos }] = await Promise.all([
    consulta,
    supabase.from("vinculos").select("usuario_id, secretaria_id, papel"),
  ]);
  if (!usuarios?.length) return [];

  // Só os e-mails dos ids que o RLS devolveu (nada de outras prefeituras).
  const contas = await Promise.all(usuarios.map((u) => servico.auth.admin.getUserById(u.id)));
  const emails = new Map(contas.map(({ data }) => [data.user?.id, data.user?.email ?? ""]));

  return usuarios.map((u) => {
    const meus = (vinculos ?? []).filter((v) => v.usuario_id === u.id);
    return {
      id: u.id,
      nome: u.nome,
      matricula: u.matricula,
      email: emails.get(u.id) ?? "",
      perfil: u.administrador ? "administrador" : ((meus[0]?.papel as Perfil | undefined) ?? "consulta"),
      ativo: u.ativo,
      trocaSenha: u.troca_senha_obrigatoria,
      secretarias: meus.map((v) => v.secretaria_id as string),
    };
  });
}

export async function listarSecretarias(): Promise<{ id: string; nome: string; ativa: boolean }[]> {
  const supabase = await clienteSessao();
  if (!supabase) return [];
  const { data } = await supabase.from("secretarias").select("id, nome, ativa").order("nome");
  return data ?? [];
}
