import "server-only";
import { aceiteEmDia } from "@/features/aceite/dados";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { clienteServico, clienteSessao } from "@/lib/supabase/servidor";
import { idSchema } from "@/features/login/esquemas";
import { ipDaRequisicao } from "@/features/login/seguranca";
import { COOKIE_SECRETARIA } from "./cookies";
import { PREFEITURA_DEMO, PREFEITURAS_DEMO, SECRETARIAS_DEMO, VINCULOS_DEMO, emDemo } from "@/features/demo/dados";
import { perfilDemo } from "@/features/demo/sessao";
import { euParceira, prefeiturasDaEmpresa } from "@/features/parceira/dados";
import { COOKIE_PARCEIRA_PREF, administraAcervo, escolherPrefeitura } from "@/features/parceira/escolha";

// Camada de acesso: toda tela e ação confere a sessão aqui, no servidor.

export type Usuario = {
  id: string;
  prefeituraId: string;
  nome: string;
  administrador: boolean;
  trocaSenha: boolean;
  /** Pessoa da empresa parceira atuando em uma prefeitura (nunca administradora). */
  parceira?: boolean;
};

export type Secretaria = { id: string | null; nome: string };

// getClaims confere a assinatura do token (sem ir ao Supabase Auth quando a
// chave é assimétrica). A linha de usuarios só volta se a pessoa está ativa e
// a sessão ainda existe no banco (RLS + app.sessao_valida): bloqueio e
// sessão encerrada cortam o acesso mesmo com token dentro da validade.
export const usuarioAtual = cache(async (): Promise<Usuario | null> => {
  if (emDemo()) {
    const perfil = await perfilDemo();
    if (perfil?.startsWith("parceira_")) return usuarioParceira(null);
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
  if (!data) return usuarioParceira(id);
  return {
    id: data.id,
    prefeituraId: data.prefeitura_id,
    nome: data.nome,
    administrador: data.administrador,
    trocaSenha: data.troca_senha_obrigatoria,
  };
});

// Pessoa da empresa parceira: usuário sintético na prefeitura escolhida (cookie, conferido contra as
// permitidas no servidor). O contexto do banco só é regravado (parceira_atuar) quando difere da escolha;
// se a gravação falhar ou o banco não confirmar a prefeitura, NÃO há sessão (nunca vale contexto antigo).
// Sem o segundo fator, devolve o usuário SEM prefeitura para exigirSessao mandar ao código.
const usuarioParceira = cache(async (uid: string | null): Promise<Usuario | null> => {
  const eu = await euParceira();
  if (!eu) return null;
  const base = { id: uid ?? eu.pessoaId, nome: eu.nome, administrador: false, trocaSenha: eu.trocaSenha, parceira: true };
  if (await faltaSegundoFator()) return { ...base, prefeituraId: "" };
  const permitidas = await prefeiturasDaEmpresa();
  const prefeituraId = escolherPrefeitura((await cookies()).get(COOKIE_PARCEIRA_PREF)?.value, permitidas, false);
  if (!prefeituraId) return null;
  if (!emDemo() && !(await contextoConfere(prefeituraId))) return null;
  return { ...base, prefeituraId };
});

async function contextoConfere(prefeituraId: string) {
  const sb = await clienteSessao();
  if (!sb) return false;
  const atuando = async () => ((await sb.rpc("parceira_atuando")).data as { id: string }[] | null)?.[0]?.id;
  if ((await atuando()) === prefeituraId) return true;
  const { error } = await sb.rpc("parceira_atuar", { p_prefeitura: prefeituraId });
  return !error && (await atuando()) === prefeituraId;
}

// Só a pessoa de prefeitura (usuarios). Telas de login, senha e segundo fator da prefeitura usam esta:
// a empresa parceira tem as suas (/parceira/...).
export async function usuarioDePrefeitura() {
  const u = await usuarioAtual();
  return u?.parceira ? null : u;
}

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
  const todas = u.administrador || !!u.parceira;
  if (emDemo()) {
    const ativas = SECRETARIAS_DEMO.filter((s) => s.ativa && (todas || VINCULOS_DEMO.includes(s.id)));
    const lista = ativas.map(({ id, nome }) => ({ id, nome }));
    return todas ? [...lista, { id: null, nome: "Todas as secretarias" }] : lista;
  }
  const supabase = await clienteSessao();
  if (!supabase) return [];
  let consulta = supabase.from("secretarias").select("id, nome").eq("ativa", true).order("nome");
  if (!todas) {
    const { data: vinculos } = await supabase.from("vinculos").select("secretaria_id").eq("usuario_id", u.id);
    consulta = consulta.in("id", (vinculos ?? []).map((v) => v.secretaria_id as string));
  }
  const { data } = await consulta;
  const lista = (data ?? []) as Secretaria[];
  return todas ? [...lista, { id: null, nome: "Todas as secretarias" }] : lista;
});

export async function secretariaPermitida(u: Usuario, valor: string | undefined) {
  if (valor !== "todas" && !idSchema.safeParse(valor).success) return null;
  const alvo = valor === "todas" ? null : valor;
  return (await secretariasPermitidas(u)).find((s) => s.id === alvo) ?? null;
}

// A secretaria escolhida no login é filtro da tela; o vínculo é conferido de novo.
export async function secretariaAtual(u: Usuario) {
  const escolhida = await secretariaPermitida(u, (await cookies()).get(COOKIE_SECRETARIA)?.value);
  // A empresa não tem a tela de escolha do login: sem filtro válido, vê todas as secretarias.
  return escolhida ?? (u.parceira ? ((await secretariasPermitidas(u)).find((s) => s.id === null) ?? null) : null);
}

export async function exigirSessao() {
  const usuario = await usuarioAtual();
  // Pessoa da empresa sem contexto confirmado no banco: volta ao painel para escolher a prefeitura.
  if (!usuario) redirect((await euParceira()) ? "/parceira" : "/entrar");
  if (usuario.parceira) {
    // A empresa também exige o segundo fator e troca a senha na tela própria; o aceite é por prefeitura.
    if (await faltaSegundoFator()) redirect("/segundo-fator");
    if (usuario.trocaSenha) redirect("/parceira/nova-senha");
    const secretaria = await secretariaAtual(usuario);
    if (!secretaria) redirect("/parceira");
    return { usuario, secretaria };
  }
  // Administrador sem o segundo fator não usa o sistema (o banco também exige aal2).
  if (usuario.administrador && (await faltaSegundoFator())) redirect("/segundo-fator");
  if (usuario.trocaSenha) redirect("/nova-senha");
  if (!(await aceiteEmDia())) redirect("/aceite");
  const secretaria = await secretariaAtual(usuario);
  if (!secretaria) redirect("/entrar/dados");
  return { usuario, secretaria };
}

// Mesma guarda de exigirSessao (segundo fator, troca de senha, aceite) para rotas e ações que não
// podem redirecionar (PDF, upload): devolve o status em vez de mandar para outra tela.
export async function usuarioLiberado(): Promise<{ usuario: Usuario; status?: undefined } | { usuario?: undefined; status: 401 | 403 }> {
  const usuario = await usuarioAtual();
  if (!usuario) return { status: 401 };
  if (usuario.parceira) {
    if ((await faltaSegundoFator()) || usuario.trocaSenha || !usuario.prefeituraId) return { status: 403 };
    return { usuario };
  }
  if ((usuario.administrador && (await faltaSegundoFator())) || usuario.trocaSenha || !(await aceiteEmDia())) return { status: 403 };
  return { usuario };
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

// Telas e ações do acervo (estrutura, caixas, planta, temporalidade): administrador OU pessoa da empresa parceira.
export async function exigirAcervo() {
  const sessao = await exigirSessao();
  if (!administraAcervo(sessao.usuario)) redirect("/inicio");
  return sessao;
}

// Telas só da prefeitura (empréstimos, relatórios...): a empresa parceira não usa.
export async function exigirPrefeitura() {
  const sessao = await exigirSessao();
  if (sessao.usuario.parceira) redirect("/parceira");
  return sessao;
}

// Nome da prefeitura, mostrado no cabeçalho (como no canvas).
export const nomePrefeitura = cache(async (u: Usuario): Promise<string> => {
  if (emDemo()) {
    if (u.parceira) return (await prefeiturasDaEmpresa()).find((p) => p.id === u.prefeituraId)?.nome ?? "Prefeitura";
    return PREFEITURAS_DEMO.find((p) => p.id === u.prefeituraId)?.nome ?? "Prefeitura";
  }
  const supabase = await clienteSessao();
  if (!supabase) return "Prefeitura";
  if (u.parceira) return (await prefeituraAtuando())?.nome ?? "Prefeitura";
  const { data } = await supabase.from("prefeituras").select("nome").eq("id", u.prefeituraId).maybeSingle();
  return data?.nome ?? "Prefeitura";
});

// Prefeitura em que a pessoa da empresa atua. A RLS de prefeituras não deixa a empresa ler a linha
// (mensalidade, contrato, TCE): só estes campos, pela função do banco.
export const prefeituraAtuando = cache(async () => {
  const sb = await clienteSessao();
  const { data } = (await sb?.rpc("parceira_atuando")) ?? { data: null };
  const l = (data as { nome: string; limite_pdf_mb: number; caixas_por_modulo: number }[] | null)?.[0];
  return l ? { nome: l.nome, limitePdfMb: l.limite_pdf_mb, caixasPorModulo: l.caixas_por_modulo } : null;
});
