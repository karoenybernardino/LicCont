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

// Grava primeiro os vínculos novos (ou o papel novo) e só depois apaga os que
// saíram: a pessoa nunca fica sem secretaria no meio do caminho.
async function gravarVinculos(c: Contexto, usuarioId: string, perfil: string, secretarias: string[]) {
  const manter = perfil === "administrador" ? [] : [...new Set(secretarias)];
  const { data: atuais, error } = await c.supabase
    .from("vinculos")
    .select("secretaria_id")
    .eq("usuario_id", usuarioId);
  if (error) return error;
  const existentes = new Set((atuais ?? []).map((v) => v.secretaria_id as string));
  const novas = manter.filter((s) => !existentes.has(s));

  if (novas.length) {
    const { error: e } = await c.supabase.from("vinculos").insert(
      novas.map((s) => ({ prefeitura_id: c.usuario.prefeituraId, usuario_id: usuarioId, secretaria_id: s, papel: perfil })),
    );
    if (e) return e;
  }
  const mantidas = manter.filter((s) => existentes.has(s));
  if (mantidas.length) {
    const { error: e } = await c.supabase
      .from("vinculos")
      .update({ papel: perfil })
      .eq("usuario_id", usuarioId)
      .in("secretaria_id", mantidas);
    if (e) return e;
  }
  const removidas = [...existentes].filter((s) => !manter.includes(s));
  if (!removidas.length) return null;
  const { error: e } = await c.supabase
    .from("vinculos")
    .delete()
    .eq("usuario_id", usuarioId)
    .in("secretaria_id", removidas);
  return e;
}

// Mensagem neutra: não revela se o e-mail tem conta em outro órgão.
const EMAIL_RECUSADO =
  "Não foi possível cadastrar este e-mail. Se a pessoa já usa o LicCONT em outro órgão, use outro e-mail institucional.";

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
    return { erro: error?.code === "email_exists" ? EMAIL_RECUSADO : FALHA };
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
  revalidatePath("/usuarios", "layout");
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
  revalidatePath("/usuarios", "layout");
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
  revalidatePath("/usuarios", "layout");
  if (!bloquear) return { aviso: "Usuário desbloqueado." };
  // Bloqueado já perde o acesso na hora (RLS); as sessões caem junto.
  const { error: erroSessoes } = await c.supabase.rpc("encerrar_sessoes", { p_usuario: id.data });
  return { aviso: erroSessoes ? "Usuário bloqueado." : "Usuário bloqueado e sessões encerradas." };
}

export async function encerrarSessoes(_: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const c = await contexto();
  if (!c) return { erro: MENSAGEM_INDISPONIVEL };
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return { erro: FALHA };
  if (id.data === c.usuario.id) return { erro: "Para sair, use o botão Sair." };
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

  // Primeiro marca a troca obrigatória e registra; só então troca a senha.
  const { error: erroTroca } = await c.servico
    .from("usuarios")
    .update({ troca_senha_obrigatoria: true })
    .eq("id", id.data);
  if (erroTroca) return { erro: FALHA };
  const { ip, aparelho } = await origemDaRequisicao();
  const { error: erroAuditoria } = await c.servico.rpc("registrar_auditoria_sistema", {
    p_prefeitura: c.usuario.prefeituraId,
    p_usuario: c.usuario.id,
    p_acao: "usuarios.senha_redefinida",
    p_ip: ip,
    p_aparelho: aparelho,
    p_depois: { usuario: id.data },
  });
  if (erroAuditoria) return { erro: FALHA };

  const senha = senhaProvisoria();
  const { error } = await c.servico.auth.admin.updateUserById(id.data, { password: senha });
  if (error) return { erro: FALHA };
  const { error: erroSessoes } = await c.supabase.rpc("encerrar_sessoes", { p_usuario: id.data });
  revalidatePath("/usuarios", "layout");
  if (erroSessoes) return { aviso: "Senha redefinida. Não foi possível encerrar as sessões abertas.", senha };
  return { aviso: "Senha redefinida e sessões encerradas.", senha };
}
