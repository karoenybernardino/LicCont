"use server";

import { revalidatePath } from "next/cache";
import { clienteServico, clienteSessao } from "@/lib/supabase/servidor";
import { exigirEquipe } from "@/features/sessao/dal";
import { MENSAGEM_INDISPONIVEL, idSchema } from "@/features/login/esquemas";
import type { EstadoAcao } from "@/ui/formulario";
import { AVISO_DEMO, emDemo } from "@/features/demo/dados";
import { emailSchema, lerUsuario, senhaProvisoria } from "./esquemas";

const FALHA = "Não foi possível salvar. Tente de novo.";

// Só a equipe LicCONT (exigirEquipe: segundo fator incluso) cadastra e edita
// usuários de uma prefeitura, que vem no formulário. A gravação é por funções
// do banco (public.equipe_*), que conferem a equipe de novo. A service_role só
// cria a conta no Auth, troca a senha e lê e-mails.
async function contexto(formData: FormData) {
  await exigirEquipe();
  const supabase = await clienteSessao();
  const servico = clienteServico();
  const prefeitura = idSchema.safeParse(formData.get("prefeitura"));
  return supabase && servico && prefeitura.success ? { supabase, servico, prefeitura: prefeitura.data } : null;
}

// Mensagem neutra: não revela se o e-mail tem conta em outro órgão.
const EMAIL_RECUSADO =
  "Não foi possível cadastrar este e-mail. Se a pessoa já usa o LicCONT em outro órgão, use outro e-mail institucional.";

export async function cadastrarUsuario(_: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const c = await contexto(formData);
  if (emDemo()) return { aviso: AVISO_DEMO };
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
  const { error: erroBanco } = await c.supabase.rpc("equipe_incluir_usuario", {
    p_prefeitura: c.prefeitura,
    p_usuario: id,
    p_nome: dados.data.nome,
    p_matricula: dados.data.matricula,
    p_perfil: dados.data.perfil,
    p_secretarias: dados.data.perfil === "administrador" ? [] : dados.data.secretarias,
  });
  if (erroBanco) {
    // Desfaz: apagar a conta apaga usuarios e vinculos (cascata).
    await c.servico.auth.admin.deleteUser(id);
    return { erro: erroBanco.code === "23514" ? "Confira o perfil e as secretarias (administradores: no máximo 5)." : FALHA };
  }
  revalidatePath("/equipe", "layout");
  return { aviso: "Usuário cadastrado.", senha };
}

export async function salvarUsuario(_: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const c = await contexto(formData);
  if (emDemo()) return { aviso: AVISO_DEMO };
  if (!c) return { erro: MENSAGEM_INDISPONIVEL };
  const id = idSchema.safeParse(formData.get("id"));
  const dados = lerUsuario(formData);
  if (!id.success) return { erro: FALHA };
  if (!dados.success) return { erro: dados.error.issues[0].message };

  const { data, error } = await c.supabase.rpc("equipe_salvar_usuario", {
    p_prefeitura: c.prefeitura,
    p_usuario: id.data,
    p_nome: dados.data.nome,
    p_matricula: dados.data.matricula,
    p_perfil: dados.data.perfil,
    p_secretarias: dados.data.perfil === "administrador" ? [] : dados.data.secretarias,
  });
  if (error || !data) return { erro: FALHA };
  revalidatePath("/equipe", "layout");
  return { aviso: "Alterações salvas." };
}

export async function alternarBloqueio(_: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const c = await contexto(formData);
  if (emDemo()) return { aviso: AVISO_DEMO };
  if (!c) return { erro: MENSAGEM_INDISPONIVEL };
  const id = idSchema.safeParse(formData.get("id"));
  const bloquear = formData.get("bloquear") === "sim";
  if (!id.success) return { erro: FALHA };

  // Bloqueado já perde o acesso na hora; a função derruba as sessões junto.
  const { data, error } = await c.supabase.rpc("equipe_bloquear_usuario", { p_prefeitura: c.prefeitura, p_usuario: id.data, p_bloquear: bloquear });
  if (error || !data) return { erro: FALHA };
  revalidatePath("/equipe", "layout");
  return { aviso: bloquear ? "Usuário bloqueado e sessões encerradas." : "Usuário desbloqueado." };
}

export async function encerrarSessoes(_: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const c = await contexto(formData);
  if (emDemo()) return { aviso: AVISO_DEMO };
  if (!c) return { erro: MENSAGEM_INDISPONIVEL };
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return { erro: FALHA };
  const { data, error } = await c.supabase.rpc("equipe_encerrar_sessoes", { p_prefeitura: c.prefeitura, p_usuario: id.data });
  return error || !data ? { erro: FALHA } : { aviso: "Sessões encerradas. A pessoa precisa entrar de novo." };
}

export async function redefinirSenha(_: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const c = await contexto(formData);
  if (emDemo()) return { aviso: AVISO_DEMO };
  if (!c) return { erro: MENSAGEM_INDISPONIVEL };
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return { erro: FALHA };

  // Primeiro marca a troca obrigatória e registra (só se a pessoa for dessa
  // prefeitura); só então troca a senha.
  const { data: marcou, error: erroTroca } = await c.supabase.rpc("equipe_marcar_troca_senha", { p_prefeitura: c.prefeitura, p_usuario: id.data });
  if (erroTroca || !marcou) return { erro: FALHA };

  const senha = senhaProvisoria();
  const { error } = await c.servico.auth.admin.updateUserById(id.data, { password: senha });
  if (error) return { erro: FALHA };
  const { error: erroSessoes } = await c.supabase.rpc("equipe_encerrar_sessoes", { p_prefeitura: c.prefeitura, p_usuario: id.data });
  revalidatePath("/equipe", "layout");
  if (erroSessoes) return { aviso: "Senha redefinida. Não foi possível encerrar as sessões abertas.", senha };
  return { aviso: "Senha redefinida e sessões encerradas.", senha };
}
