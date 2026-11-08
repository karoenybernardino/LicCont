import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { clienteServico, clienteSessao } from "@/lib/supabase/servidor";
import { idSchema } from "@/features/login/esquemas";
import { ipDaRequisicao } from "@/features/login/seguranca";
import { COOKIE_SECRETARIA } from "./cookies";

// Camada de acesso: toda tela e ação confere a sessão aqui, no servidor.

export type Usuario = {
  id: string;
  prefeituraId: string;
  nome: string;
  administrador: boolean;
  trocaSenha: boolean;
};

export type Secretaria = { id: string | null; nome: string };

// getUser confere o token no Supabase Auth; a linha de usuarios só volta se
// a pessoa está ativa e a sessão existe (RLS + app.sessao_valida).
export const usuarioAtual = cache(async (): Promise<Usuario | null> => {
  const supabase = await clienteSessao();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("usuarios")
    .select("id, prefeitura_id, nome, administrador, troca_senha_obrigatoria")
    .eq("id", user.id)
    .maybeSingle();
  return data
    ? {
        id: data.id,
        prefeituraId: data.prefeitura_id,
        nome: data.nome,
        administrador: data.administrador,
        trocaSenha: data.troca_senha_obrigatoria,
      }
    : null;
});

// A secretaria escolhida no login é filtro da tela; o vínculo é conferido de novo.
export const secretariaAtual = cache(async (u: Usuario): Promise<Secretaria | null> => {
  const valor = (await cookies()).get(COOKIE_SECRETARIA)?.value;
  if (valor === "todas") return u.administrador ? { id: null, nome: "Todas as secretarias" } : null;
  const id = idSchema.safeParse(valor);
  const supabase = await clienteSessao();
  if (!id.success || !supabase) return null;
  const { data } = await supabase
    .from("secretarias")
    .select("id, nome")
    .eq("id", id.data)
    .eq("ativa", true)
    .maybeSingle();
  if (!data || u.administrador) return data;
  const { data: vinculo } = await supabase
    .from("vinculos")
    .select("id")
    .eq("usuario_id", u.id)
    .eq("secretaria_id", data.id)
    .maybeSingle();
  return vinculo ? data : null;
});

export async function exigirSessao() {
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/entrar");
  if (usuario.trocaSenha) redirect("/nova-senha");
  const secretaria = await secretariaAtual(usuario);
  if (!secretaria) redirect("/entrar/dados");
  return { usuario, secretaria };
}

export const membroEquipe = cache(async (): Promise<{ id: string } | null> => {
  const supabase = await clienteSessao();
  const servico = clienteServico();
  if (!supabase || !servico) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await servico
    .from("equipe_liccont")
    .select("usuario_id")
    .eq("usuario_id", user.id)
    .maybeSingle();
  return data ? { id: user.id } : null;
});

export async function exigirEquipe() {
  const membro = await membroEquipe();
  if (!membro) redirect("/equipe/entrar");
  return membro;
}

// IP e navegador vêm do servidor (nunca do formulário).
export async function origemDaRequisicao() {
  const h = await headers();
  return { ip: ipDaRequisicao(h), aparelho: h.get("user-agent")?.slice(0, 300) ?? null };
}
