"use server";

import { revalidatePath } from "next/cache";
import { clienteSessao } from "@/lib/supabase/servidor";
import { exigirAcervo, exigirSessao } from "@/features/sessao/dal";
import { administraAcervo } from "@/features/parceira/escolha";
import { MENSAGEM_INDISPONIVEL } from "@/features/login/esquemas";
import type { EstadoAcao } from "@/ui/formulario";
import { AVISO_DEMO, emDemo } from "@/features/demo/dados";
import { lerCaixasPorModulo, podeCaixas } from "./dados";
import { CAIXAS_POR_NIVEL, niveisPorModulo } from "./capacidade";
import {
  esquemaCaixas,
  esquemaCapacidade,
  esquemaGalpao,
  esquemaModulos,
  esquemaRua,
  esquemaSituacao,
  mensagemErro,
} from "./esquemas";
import { proximaRua } from "./ocupacao";

// Toda ação confere a permissão aqui e grava pela sessão do usuário: o RLS
// confere de novo prefeitura, papel e segundo fator.

const SEM_PERMISSAO: EstadoAcao = { erro: "Você não tem permissão para esta ação." };
const INVALIDO: EstadoAcao = { erro: "Confira os dados e tente de novo." };

function pronto(aviso: string): EstadoAcao {
  revalidatePath("/estrutura", "layout");
  return { aviso };
}

export async function cadastrarGalpao(_: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const { usuario } = await exigirAcervo();
  const dados = esquemaGalpao.safeParse({ nome: formData.get("nome") });
  if (!dados.success) return { erro: dados.error.issues[0].message };
  if (emDemo()) return { aviso: AVISO_DEMO };
  const sb = await clienteSessao();
  if (!sb) return { erro: MENSAGEM_INDISPONIVEL };
  const { error } = await sb.from("galpoes").insert({ prefeitura_id: usuario.prefeituraId, nome: dados.data.nome });
  return error ? { erro: mensagemErro(error.code) } : pronto("Galpão cadastrado.");
}

export async function cadastrarRua(_: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const { usuario } = await exigirAcervo();
  const dados = esquemaRua.safeParse({ galpao: formData.get("galpao") });
  if (!dados.success) return INVALIDO;
  if (emDemo()) return { aviso: AVISO_DEMO };
  const sb = await clienteSessao();
  if (!sb) return { erro: MENSAGEM_INDISPONIVEL };
  const { data: ruas } = await sb.from("ruas").select("codigo").eq("galpao_id", dados.data.galpao);
  const codigo = proximaRua((ruas ?? []).map((r) => r.codigo));
  if (!codigo) return { erro: "Este galpão já tem o máximo de ruas." };
  const { error } = await sb
    .from("ruas")
    .insert({ prefeitura_id: usuario.prefeituraId, galpao_id: dados.data.galpao, codigo });
  return error ? { erro: mensagemErro(error.code) } : pronto(`Rua ${codigo} cadastrada.`);
}

export async function adicionarModulos(_: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  await exigirAcervo();
  const dados = esquemaModulos.safeParse(Object.fromEntries(formData));
  if (!dados.success) return INVALIDO;
  if (emDemo()) return { aviso: AVISO_DEMO };
  const sb = await clienteSessao();
  if (!sb) return { erro: MENSAGEM_INDISPONIVEL };
  const { rua, modulos } = dados.data;
  const niveis = niveisPorModulo(await lerCaixasPorModulo());
  const capacidade = CAIXAS_POR_NIVEL;
  const { data: inicio, error } = await sb.rpc("adicionar_modulos", {
    p_rua: rua,
    p_modulos: modulos,
    p_niveis: niveis,
    p_capacidade: capacidade,
  });
  if (error) return { erro: mensagemErro(error.code) };
  const fim = inicio + modulos - 1;
  return pronto(modulos === 1 ? `Módulo ${inicio} adicionado.` : `Módulos ${inicio} a ${fim} adicionados.`);
}

export async function alterarCapacidade(_: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  await exigirAcervo();
  const dados = esquemaCapacidade.safeParse(Object.fromEntries(formData));
  if (!dados.success) return INVALIDO;
  if (emDemo()) return { aviso: AVISO_DEMO };
  const sb = await clienteSessao();
  if (!sb) return { erro: MENSAGEM_INDISPONIVEL };
  const { data, error } = await sb
    .from("niveis")
    .update({ capacidade: dados.data.capacidade })
    .eq("id", dados.data.id)
    .select("id");
  if (error) return { erro: mensagemErro(error.code) };
  return data?.length ? pronto("Capacidade alterada.") : SEM_PERMISSAO;
}

export async function adicionarCaixas(_: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const { usuario } = await exigirSessao();
  if (!(await podeCaixas(usuario))) return SEM_PERMISSAO;
  const dados = esquemaCaixas.safeParse(Object.fromEntries(formData));
  if (!dados.success) return INVALIDO;
  if (emDemo()) return { aviso: AVISO_DEMO };
  const sb = await clienteSessao();
  if (!sb) return { erro: MENSAGEM_INDISPONIVEL };
  const { error } = await sb.rpc("adicionar_caixas", { p_nivel: dados.data.nivel, p_quantidade: dados.data.quantidade });
  if (error) return { erro: mensagemErro(error.code) };
  return pronto(dados.data.quantidade === 1 ? "Caixa cadastrada." : `${dados.data.quantidade} caixas cadastradas.`);
}

// Desativar ou reativar: estrutura só o administrador; caixa também o coordenador.
// Caixa é identificada por nível + número (posição).
export async function alterarSituacao(_: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const { usuario } = await exigirSessao();
  const dados = esquemaSituacao.safeParse(Object.fromEntries(formData));
  if (!dados.success) return INVALIDO;
  const { tabela, id, ativo } = dados.data;
  const permitido = tabela === "caixas" ? await podeCaixas(usuario) : administraAcervo(usuario);
  if (!permitido) return SEM_PERMISSAO;
  if (emDemo()) return { aviso: AVISO_DEMO };
  const sb = await clienteSessao();
  if (!sb) return { erro: MENSAGEM_INDISPONIVEL };

  let consulta = sb.from(tabela).update({ ativo });
  if (tabela === "caixas") {
    const numero = Number(formData.get("numero"));
    if (!Number.isInteger(numero) || numero < 1 || numero > 200) return INVALIDO;
    consulta = consulta.eq("nivel_id", id).eq("numero", numero);
  } else {
    consulta = consulta.eq("id", id);
  }
  const { data, error } = await consulta.select("id");
  if (error) return { erro: mensagemErro(error.code) };
  if (!data?.length) return SEM_PERMISSAO;
  return pronto(ativo ? "Reativado." : "Desativado.");
}
