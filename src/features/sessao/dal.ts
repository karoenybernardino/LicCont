import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { clienteServico, clienteSessao } from "@/lib/supabase/servidor";
import { idSchema } from "@/features/login/esquemas";
import { ipDaRequisicao } from "@/features/login/seguranca";
import { COOKIE_SECRETARIA } from "./cookies";
import { PREFEITURA_DEMO, PREFEITURAS_DEMO, SECRETARIAS_DEMO, VINCULOS_DEMO, emDemo } from "@/features/demo/dados";
import { perfilDemo } from "@/features/demo/sessao";

// Camada de acesso: toda tela e ação confere a sessão aqui, no servidor.

export type Usuario = {
  id: string;
  prefeituraId: string;
  nome: string;
  administrador: boolean;
  trocaSenha: boolean;
};

export type Secretaria = { id: string | null; nome: string };

// getClaims confere a assinatura do token (sem ir ao Supabase Auth quando a
// chave é assimétrica). A linha de usuarios só volta se a pessoa está ativa e
// a sessão ainda existe no banco (RLS + app.sessao_valida): bloqueio e
// sessão encerrada cortam o acesso mesmo com token dentro da validade.
export const usuarioAtual = cache(async (): Promise<Usuario | null> => {
  if (emDemo()) {
    const perfil = await perfilDemo();
    if (!perfil || perfil === "equipe") return null;
    return {
      id: "de200000-0000-0000-0000-000000000099",
      prefeituraId: PREFEITURA_DEMO,
      nome: "Pessoa de demonstração",
      administrador: perfil === "administrador",
      trocaSenha: false,
    };
  }
  const supabase = await clienteSessao();
  if (!supabase) return null;
  const { data: token } = await supabase.auth.getClaims();
  const id = token?.claims.sub;
  if (!id) return null;
  const { data } = await supabase
    .from("usuarios")
    .select("id, prefeitura_id, nome, administrador, troca_senha_obrigatoria")
    .eq("id", id)
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
// Lê o aal do token sem conferir assinatura: chamar sempre depois de
// usuarioAtual() ou membroEquipe(), que validam o token.
export const nivelSessao = cache(async () => {
  const supabase = await clienteSessao();
  if (!supabase) return null;
  const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  return data?.currentLevel ?? null;
});

// Chave do banco (app.configuracao): o segundo fator está obrigatório?
// Erro ou sem resposta conta como obrigatório.
export const segundoFatorObrigatorio = cache(async () => {
  if (emDemo()) return false;
  const servico = clienteServico();
  if (!servico) return true;
  const { data, error } = await servico.rpc("segundo_fator_obrigatorio");
  return error ? true : data !== false;
});

// Falta o código do autenticador para esta sessão?
export async function faltaSegundoFator() {
  return (await segundoFatorObrigatorio()) && (await nivelSessao()) !== "aal2";
}

// Secretarias que a pessoa pode escolher como filtro da tela: as dos
// vínculos; para o administrador, todas as ativas e "Todas as secretarias".
export const secretariasPermitidas = cache(async (u: Usuario): Promise<Secretaria[]> => {
  if (emDemo()) {
    const ativas = SECRETARIAS_DEMO.filter((s) => s.ativa && (u.administrador || VINCULOS_DEMO.includes(s.id)));
    const lista = ativas.map(({ id, nome }) => ({ id, nome }));
    return u.administrador ? [...lista, { id: null, nome: "Todas as secretarias" }] : lista;
  }
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
  if (usuario.administrador && (await faltaSegundoFator())) redirect("/segundo-fator");
  if (usuario.trocaSenha) redirect("/nova-senha");
  const secretaria = await secretariaAtual(usuario);
  if (!secretaria) redirect("/entrar/dados");
  return { usuario, secretaria };
}

// Só diz se a pessoa é da equipe; NÃO confere o segundo fator. Porteiro de
// tela ou ação da equipe é sempre exigirEquipe().
export const membroEquipe = cache(async (): Promise<{ id: string } | null> => {
  if (emDemo()) return (await perfilDemo()) === "equipe" ? { id: "de200000-0000-0000-0000-000000000098" } : null;
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
  if (await faltaSegundoFator()) redirect("/segundo-fator");
  return membro;
}

// IP e navegador vêm do servidor (nunca do formulário).
export async function origemDaRequisicao() {
  const h = await headers();
  return { ip: ipDaRequisicao(h), aparelho: h.get("user-agent")?.slice(0, 300) ?? null };
}

// Telas e ações do administrador (com segundo fator, conferido em exigirSessao).
export async function exigirAdmin() {
  const sessao = await exigirSessao();
  if (!sessao.usuario.administrador) redirect("/inicio");
  return sessao;
}

// Nome da prefeitura, mostrado no cabeçalho (como no canvas).
export const nomePrefeitura = cache(async (u: Usuario): Promise<string> => {
  if (emDemo()) return PREFEITURAS_DEMO.find((p) => p.id === u.prefeituraId)?.nome ?? "Prefeitura";
  const supabase = await clienteSessao();
  if (!supabase) return "Prefeitura";
  const { data } = await supabase.from("prefeituras").select("nome").eq("id", u.prefeituraId).maybeSingle();
  return data?.nome ?? "Prefeitura";
});
