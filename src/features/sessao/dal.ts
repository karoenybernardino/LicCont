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

// Nível da sessão no Supabase Auth: "aal2" depois do código do autenticador.
export const nivelSessao = cache(async () => {
  const supabase = await clienteSessao();
  if (!supabase) return null;
  const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  return data?.currentLevel ?? null;
});

// Secretarias que a pessoa pode escolher como filtro da tela: as dos
// vínculos; para o administrador, todas as ativas e "Todas as secretarias".
export const secretariasPermitidas = cache(async (u: Usuario): Promise<Secretaria[]> => {
  const supabase = await clienteSessao();
  if (!supabase) return [];
  let consulta = supabase.from("secretarias").select("id, nome").eq("ativa", true).order("nome");
  if (!u.administrador) {
    const { data: vinculos } = await supabase.from("vinculos").select("secretaria_id").eq("usuario_id", u.id);
    consulta = consulta.in("id", (vinculos ?? []).map((v) => v.secretaria_id as string));
  }
  const { data } = await consulta;
  const lista = (data ?? []) as Secretaria[];
  return u.administrador ? [...lista, { id: null, nome: "Todas as secretarias" }] : lista;
});

export async function secretariaPermitida(u: Usuario, valor: string | undefined) {
  if (valor !== "todas" && !idSchema.safeParse(valor).success) return null;
  const alvo = valor === "todas" ? null : valor;
  return (await secretariasPermitidas(u)).find((s) => s.id === alvo) ?? null;
}

// A secretaria escolhida no login é filtro da tela; o vínculo é conferido de novo.
export async function secretariaAtual(u: Usuario) {
  return secretariaPermitida(u, (await cookies()).get(COOKIE_SECRETARIA)?.value);
}

export async function exigirSessao() {
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/entrar");
  // Administrador sem o segundo fator não usa o sistema (o banco também exige aal2).
  if (usuario.administrador && (await nivelSessao()) !== "aal2") redirect("/segundo-fator");
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
  if ((await nivelSessao()) !== "aal2") redirect("/segundo-fator");
  return membro;
}

// IP e navegador vêm do servidor (nunca do formulário).
export async function origemDaRequisicao() {
  const h = await headers();
  return { ip: ipDaRequisicao(h), aparelho: h.get("user-agent")?.slice(0, 300) ?? null };
}
