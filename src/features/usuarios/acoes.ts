"use server";

import { revalidatePath } from "next/cache";
import { clienteServico, clienteSessao } from "@/lib/supabase/servidor";
import { exigirAdmin, origemDaRequisicao } from "@/features/sessao/dal";
import { MENSAGEM_INDISPONIVEL, idSchema } from "@/features/login/esquemas";
import type { EstadoAcao } from "@/ui/formulario";
import { emailSchema, lerUsuario, senhaProvisoria } from "./esquemas";

const FALHA = "Não foi possível salvar. Tente de novo.";

// Toda ação confere administrador com segundo fator (exigirAdmin) e grava
// pela sessão dele, sujeita ao RLS. A service_role só cria a conta no Auth,
// troca a senha e lê e-mails.
async function contexto() {
  const { usuario } = await exigirAdmin();
  const supabase = await clienteSessao();
  const servico = clienteServico();
  return supabase && servico ? { usuario, supabase, servico } : null;
}

type Contexto = NonNullable<Awaited<ReturnType<typeof contexto>>>;

async function gravarVinculos(c: Contexto, usuarioId: string, perfil: string, secretarias: string[]) {
  const { error } = await c.supabase.from("vinculos").delete().eq("usuario_id", usuarioId);
  if (error) return error;
  if (perfil === "administrador" || !secretarias.length) return null;
  const { error: erroInsercao } = await c.supabase.from("vinculos").insert(
    secretarias.map((s) => ({
      prefeitura_id: c.usuario.prefeituraId,
      usuario_id: usuarioId,
      secretaria_id: s,
      papel: perfil,
    })),
  );
  return erroInsercao;
}

export async function cadastrarUsuario(_: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const c = await contexto();
  if (!c) return { erro: MENSAGEM_INDISPONIVEL };
  const dados = lerUsuario(formData);
  const email = emailSchema.safeParse(formData.get("email"));
  if (!dados.success) return { erro: dados.error.issues[0].message };
  if (!email.success) return { erro: email.error.issues[0].message };

  const senha = senhaProvisoria();
  const { data, error } = await c.servico.auth.admin.createUser({
    email: email.data,
    password: senha,
    email_confirm: true,
  });
  if (error || !data.user) {
    return { erro: error?.code === "email_exists" ? "Já existe uma conta com este e-mail." : FALHA };
  }

  const id = data.user.id;
  const { error: erroUsuario } = await c.supabase.from("usuarios").insert({
    id,
    prefeitura_id: c.usuario.prefeituraId,
    nome: dados.data.nome,
    matricula: dados.data.matricula,
    administrador: dados.data.perfil === "administrador",
  });
  const erroVinculos = erroUsuario ? null : await gravarVinculos(c, id, dados.data.perfil, dados.data.secretarias);
  if (erroUsuario || erroVinculos) {
    // Desfaz: apagar a conta apaga usuarios e vinculos (cascata).
    await c.servico.auth.admin.deleteUser(id);
    return { erro: FALHA };
  }
  revalidatePath("/usuarios");
  return { aviso: "Usuário cadastrado.", senha };
}

export async function salvarUsuario(_: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const c = await contexto();
  if (!c) return { erro: MENSAGEM_INDISPONIVEL };
  const id = idSchema.safeParse(formData.get("id"));
  const dados = lerUsuario(formData);
  if (!id.success) return { erro: FALHA };
  if (!dados.success) return { erro: dados.error.issues[0].message };

  const { data, error } = await c.supabase
    .from("usuarios")
    .update({
      nome: dados.data.nome,
      matricula: dados.data.matricula,
      administrador: dados.data.perfil === "administrador",
    })
    .eq("id", id.data)
    .select("id");
  if (error?.code === "42501") return { erro: "Você não pode mudar o seu próprio perfil de administrador." };
  if (error || !data?.length) return { erro: FALHA };
  if (await gravarVinculos(c, id.data, dados.data.perfil, dados.data.secretarias)) return { erro: FALHA };
  revalidatePath("/usuarios");
  return { aviso: "Alterações salvas." };
}

export async function alternarBloqueio(_: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const c = await contexto();
  if (!c) return { erro: MENSAGEM_INDISPONIVEL };
  const id = idSchema.safeParse(formData.get("id"));
  const bloquear = formData.get("bloquear") === "sim";
  if (!id.success) return { erro: FALHA };
  if (id.data === c.usuario.id) return { erro: "Você não pode bloquear a si mesmo." };

  const { data, error } = await c.supabase
    .from("usuarios")
    .update({ ativo: !bloquear })
    .eq("id", id.data)
    .select("id");
  if (error || !data?.length) return { erro: FALHA };
  // Bloqueado perde o acesso na hora: as sessões caem junto.
  if (bloquear) await c.supabase.rpc("encerrar_sessoes", { p_usuario: id.data });
  revalidatePath("/usuarios");
  return { aviso: bloquear ? "Usuário bloqueado e sessões encerradas." : "Usuário desbloqueado." };
}

export async function encerrarSessoes(_: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const c = await contexto();
  if (!c) return { erro: MENSAGEM_INDISPONIVEL };
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return { erro: FALHA };
  const { error } = await c.supabase.rpc("encerrar_sessoes", { p_usuario: id.data });
  return error ? { erro: FALHA } : { aviso: "Sessões encerradas. A pessoa precisa entrar de novo." };
}

export async function redefinirSenha(_: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const c = await contexto();
  if (!c) return { erro: MENSAGEM_INDISPONIVEL };
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return { erro: FALHA };
  if (id.data === c.usuario.id) return { erro: "Para a sua própria senha, peça a outro administrador." };

  // O RLS só devolve a linha se a pessoa for da prefeitura do administrador.
  const { data: alvo } = await c.supabase.from("usuarios").select("id").eq("id", id.data).maybeSingle();
  if (!alvo) return { erro: FALHA };

  const senha = senhaProvisoria();
  const { error } = await c.servico.auth.admin.updateUserById(id.data, { password: senha });
  if (error) return { erro: FALHA };
  const { error: erroTroca } = await c.servico
    .from("usuarios")
    .update({ troca_senha_obrigatoria: true })
    .eq("id", id.data);
  if (erroTroca) return { erro: FALHA };
  await c.supabase.rpc("encerrar_sessoes", { p_usuario: id.data });

  const { ip, aparelho } = await origemDaRequisicao();
  await c.servico.rpc("registrar_auditoria_sistema", {
    p_prefeitura: c.usuario.prefeituraId,
    p_usuario: c.usuario.id,
    p_acao: "usuarios.senha_redefinida",
    p_ip: ip,
    p_aparelho: aparelho,
    p_depois: { usuario: id.data },
  });
  revalidatePath("/usuarios");
  return { aviso: "Senha redefinida e sessões encerradas.", senha };
}
