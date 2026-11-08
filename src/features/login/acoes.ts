"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { clientePublico, clienteServico, clienteSessao } from "@/lib/supabase/servidor";
import {
  COOKIE_ATIVIDADE,
  COOKIE_PREFEITURA,
  COOKIE_SECRETARIA,
  ehCookieSupabase,
  opcoesCookie,
} from "@/features/sessao/cookies";
import { nivelSessao, origemDaRequisicao, usuarioAtual } from "@/features/sessao/dal";
import {
  MENSAGEM_ERRO_LOGIN,
  MENSAGEM_INDISPONIVEL,
  esquemaLogin,
  esquemaLoginEquipe,
  esquemaNovaSenha,
  idSchema,
} from "./esquemas";
import { hashEmail, verificarSenhaVazada } from "./seguranca";

export type EstadoFormulario = { erro?: string } | undefined;

// Toda falha leva o mesmo tempo mínimo: o tempo de resposta não revela se o
// e-mail existe.
const ESPERA_MINIMA_MS = 1500;

async function falhar(inicio: number): Promise<EstadoFormulario> {
  const resta = ESPERA_MINIMA_MS - (Date.now() - inicio);
  if (resta > 0) await new Promise((r) => setTimeout(r, resta));
  return { erro: MENSAGEM_ERRO_LOGIN };
}

export async function escolherPrefeitura(formData: FormData) {
  const id = idSchema.safeParse(formData.get("prefeitura"));
  const publico = clientePublico();
  if (!id.success || !publico) redirect("/entrar");
  const { data } = await publico.rpc("prefeituras_para_login");
  if (!(data as { id: string }[] | null)?.some((p) => p.id === id.data)) redirect("/entrar");
  (await cookies()).set(COOKIE_PREFEITURA, id.data, { ...opcoesCookie, maxAge: 60 * 60 * 24 * 365 });
  redirect("/entrar/dados");
}

type Conferir = (servico: SupabaseClient, usuarioId: string) => Promise<boolean>;

// Passos comuns ao login da prefeitura e da equipe: limite de tentativas,
// senha no Supabase Auth e a conferência própria de cada tela.
// `prefeitura` só vai para a auditoria se existir e estiver ativa.
async function autenticar(email: string, senha: string, prefeitura: string | null, conferir: Conferir) {
  const segredo = process.env.LOGIN_HASH_SEGREDO;
  const supabase = await clienteSessao();
  const servico = clienteServico();
  if (!segredo || segredo.length < 32 || !supabase || !servico) return "indisponivel" as const;

  const { ip, aparelho } = await origemDaRequisicao();

  // Confere o bloqueio e já grava a tentativa como falha, num passo só
  // (sem corrida entre pedidos paralelos). Erro aqui barra (falha fechada).
  const { data: tentativa, error: erroTentativa } = await servico.rpc("iniciar_tentativa_login", {
    p_email_hash: hashEmail(email, segredo),
    p_ip: ip,
  });
  if (erroTentativa || tentativa === null) return null;

  const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });
  let aceito = !error && !!data.user && (await conferir(servico, data.user.id));
  if (aceito) {
    const { error: erroConclusao } = await servico.rpc("concluir_tentativa_login", { p_id: tentativa });
    aceito = !erroConclusao;
  }

  if (!aceito) {
    if (data.user) await sairSemRastro(supabase);
    await servico.rpc("registrar_auditoria_sistema", {
      p_prefeitura: prefeitura,
      p_usuario: null,
      p_acao: "login.falha",
      p_ip: ip,
      p_aparelho: aparelho,
    });
    return null;
  }
  return { supabase, servico, usuarioId: data.user!.id, ip, aparelho };
}

// Encerra a sessão recém-aberta; se o Supabase falhar, apaga os cookies mesmo assim.
async function sairSemRastro(supabase: SupabaseClient) {
  await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
  const loja = await cookies();
  for (const c of loja.getAll()) if (ehCookieSupabase(c.name)) loja.delete(c.name);
}

async function marcarAtividade() {
  (await cookies()).set(COOKIE_ATIVIDADE, String(Date.now()), opcoesCookie);
}

export async function entrar(_: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const inicio = Date.now();
  const loja = await cookies();
  const prefeitura = idSchema.safeParse(loja.get(COOKIE_PREFEITURA)?.value);
  if (!prefeitura.success) redirect("/entrar");

  const dados = esquemaLogin.safeParse({
    secretaria: formData.get("secretaria"),
    email: formData.get("email"),
    senha: formData.get("senha"),
  });
  if (!dados.success) return falhar(inicio);
  const { secretaria, email, senha } = dados.data;

  // Prefeitura escolhida em cookie: só entra na auditoria se existir e estiver ativa.
  const servicoPrefeitura = clienteServico();
  const { data: p } = servicoPrefeitura
    ? await servicoPrefeitura.from("prefeituras").select("status").eq("id", prefeitura.data).maybeSingle()
    : { data: null };
  const ativa = p?.status === "ativa";

  let troca = false;
  let administrador = false;
  const sessao = await autenticar(email, senha, ativa ? prefeitura.data : null, async (servico, id) => {
    const { data: u } = await servico
      .from("usuarios")
      .select("prefeitura_id, administrador, ativo, troca_senha_obrigatoria")
      .eq("id", id)
      .maybeSingle();
    if (!ativa || !u?.ativo || u.prefeitura_id !== prefeitura.data) return false;
    troca = u.troca_senha_obrigatoria;
    administrador = u.administrador;
    if (secretaria === "todas") return u.administrador;

    const { data: s } = await servico
      .from("secretarias")
      .select("id")
      .eq("id", secretaria)
      .eq("prefeitura_id", prefeitura.data)
      .eq("ativa", true)
      .maybeSingle();
    if (!s) return false;
    if (u.administrador) return true;
    const { data: v } = await servico
      .from("vinculos")
      .select("id")
      .eq("usuario_id", id)
      .eq("secretaria_id", secretaria)
      .maybeSingle();
    return !!v;
  });

  if (sessao === "indisponivel") return { erro: MENSAGEM_INDISPONIVEL };
  if (!sessao) return falhar(inicio);

  await sessao.supabase.rpc("registrar_auditoria", {
    p_acao: "sessao.entrada",
    p_ip: sessao.ip,
    p_aparelho: sessao.aparelho,
  });
  loja.set(COOKIE_SECRETARIA, secretaria, opcoesCookie);
  await marcarAtividade();
  // Administrador passa pelo segundo fator antes de tudo (inclusive da troca de senha).
  redirect(administrador ? "/segundo-fator" : troca ? "/nova-senha" : "/inicio");
}

export async function entrarEquipe(_: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const inicio = Date.now();
  const dados = esquemaLoginEquipe.safeParse({ email: formData.get("email"), senha: formData.get("senha") });
  if (!dados.success) return falhar(inicio);

  const sessao = await autenticar(dados.data.email, dados.data.senha, null, async (servico, id) => {
    const { data } = await servico.from("equipe_liccont").select("usuario_id").eq("usuario_id", id).maybeSingle();
    return !!data;
  });
  if (sessao === "indisponivel") return { erro: MENSAGEM_INDISPONIVEL };
  if (!sessao) return falhar(inicio);

  // A equipe não tem linha em usuarios: o registro é pelo servidor.
  await sessao.servico.rpc("registrar_auditoria_sistema", {
    p_prefeitura: null,
    p_usuario: sessao.usuarioId,
    p_acao: "sessao.entrada",
    p_ip: sessao.ip,
    p_aparelho: sessao.aparelho,
  });
  await marcarAtividade();
  redirect("/segundo-fator");
}

const MENSAGEM_VAZADA = "Esta senha aparece em vazamentos conhecidos na internet. Escolha outra.";

export async function trocarSenha(_: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const supabase = await clienteSessao();
  const servico = clienteServico();
  if (!supabase || !servico) return { erro: MENSAGEM_INDISPONIVEL };
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/entrar");
  // Troca voluntária (pedindo a senha atual) fica para depois: aqui só a provisória.
  if (!usuario.trocaSenha) redirect("/inicio");
  if (usuario.administrador && (await nivelSessao()) !== "aal2") redirect("/segundo-fator");

  const dados = esquemaNovaSenha.safeParse({
    senha: formData.get("senha"),
    confirmacao: formData.get("confirmacao"),
  });
  if (!dados.success) return { erro: dados.error.issues[0].message };

  const vazamento = await verificarSenhaVazada(dados.data.senha);
  if (vazamento === "vazada") return { erro: MENSAGEM_VAZADA };

  const { error } = await supabase.auth.updateUser({ password: dados.data.senha });
  if (error) {
    return {
      erro:
        error.code === "same_password"
          ? "A nova senha precisa ser diferente da atual."
          : "Não foi possível salvar a senha. Tente de novo.",
    };
  }

  // Só o servidor dispensa a troca obrigatória (a coluna não tem GRANT para authenticated).
  // A senha já mudou: tenta duas vezes, para a pessoa não ficar presa nesta tela.
  const dispensar = () =>
    servico.from("usuarios").update({ troca_senha_obrigatoria: false }).eq("id", usuario.id);
  const { error: erroTroca } = (await dispensar()).error ? await dispensar() : { error: null };
  if (erroTroca) return { erro: "Senha salva, mas não foi possível concluir. Saia e entre com a senha nova." };
  // Outras sessões abertas com a senha provisória caem.
  await supabase.auth.signOut({ scope: "others" });

  const { ip, aparelho } = await origemDaRequisicao();
  if (vazamento === "indisponivel") {
    // Serviço fora do ar: aceita a senha e registra o fato (sem a senha). Decisão 0006.
    await servico.rpc("registrar_auditoria_sistema", {
      p_prefeitura: usuario.prefeituraId,
      p_usuario: usuario.id,
      p_acao: "senha.verificacao_indisponivel",
      p_ip: ip,
      p_aparelho: aparelho,
    });
  }
  await supabase.rpc("registrar_auditoria", { p_acao: "senha.trocada", p_ip: ip, p_aparelho: aparelho });
  redirect("/inicio");
}
