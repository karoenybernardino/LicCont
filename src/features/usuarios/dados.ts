import "server-only";
import { clienteServico, clienteSessao } from "@/lib/supabase/servidor";
import type { Perfil } from "./esquemas";
import { SECRETARIAS_DEMO, USUARIOS_DEMO, emDemo } from "@/features/demo/dados";

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
// Com "prefeitura", é a equipe LicCONT lendo outra prefeitura (função do banco; quem chama exige a equipe).
export async function listarUsuarios(id?: string, prefeitura?: string): Promise<UsuarioLista[]> {
  if (emDemo()) {
    return USUARIOS_DEMO.filter((u) => !id || u.id === id).map((u) => ({ ...u, matricula: null, secretarias: [...u.secretarias] }));
  }
  const supabase = await clienteSessao();
  const servico = clienteServico();
  if (!supabase || !servico) return [];

  if (prefeitura) {
    const { data } = await supabase.rpc("equipe_listar_usuarios", { p_prefeitura: prefeitura });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lista = ((data ?? []) as any[]).filter((u) => !id || u.id === id);
    const contas = await Promise.all(lista.map((u) => servico.auth.admin.getUserById(u.id)));
    return lista.map((u, i) => ({
      id: u.id, nome: u.nome, matricula: u.matricula, email: contas[i].data.user?.email ?? "", perfil: u.perfil as Perfil,
      ativo: u.ativo, trocaSenha: u.troca_senha_obrigatoria, secretarias: u.secretarias,
    }));
  }

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

export async function listarSecretarias(prefeitura?: string): Promise<{ id: string; nome: string; ativa: boolean }[]> {
  if (emDemo()) return SECRETARIAS_DEMO;
  const supabase = await clienteSessao();
  if (!supabase) return [];
  if (prefeitura) {
    const { data } = await supabase.rpc("equipe_listar_secretarias", { p_prefeitura: prefeitura });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ((data ?? []) as any[]).map((s) => ({ id: s.id, nome: s.nome, ativa: s.ativa }));
  }
  const { data } = await supabase.from("secretarias").select("id, nome, ativa").order("nome");
  return data ?? [];
}
