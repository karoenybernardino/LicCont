"use server";

import { revalidatePath } from "next/cache";
import { clienteSessao } from "@/lib/supabase/servidor";
import { exigirSessao } from "@/features/sessao/dal";
import { MENSAGEM_INDISPONIVEL } from "@/features/login/esquemas";
import { AVISO_DEMO, emDemo } from "@/features/demo/dados";
import { z } from "zod";
import { caixasParaCadastro, classePorCodigo, podeCadastrar, type CaixaDoNivel, type ClasseDoCodigo } from "./dados";
import { esquemaCaixa, esquemaCodigoClasse, mensagemDocumento } from "./esquemas";

// Mesmas regras das demais ações: a permissão é conferida aqui e a gravação é pela sessão da
// pessoa (o RLS de caixas só deixa administrador e coordenador). A trilha de auditoria sai do
// gatilho do banco. Nunca vai dado para log.

export type RetornoCaixa = { erro?: string; aviso?: string; id?: string; campo?: string };

const SEM_PERMISSAO: RetornoCaixa = { erro: "Você não tem permissão para esta ação." };

// Grava os metadados de uma caixa já criada no mapa (cadastro novo ou edição: o id é da caixa).
// O número da caixa não vem do formulário: o banco numera por órgão e renumera se o órgão mudar.
export async function salvarCaixa(formData: FormData): Promise<RetornoCaixa> {
  const { usuario } = await exigirSessao();
  const dados = esquemaCaixa.safeParse(Object.fromEntries(formData));
  if (!dados.success) return { erro: dados.error.issues[0].message, campo: String(dados.error.issues[0].path[0] ?? "") };
  const d = dados.data;
  if (!(await podeCadastrar(usuario))) return SEM_PERMISSAO;
  if (d.tipo === "geral" && !d.codigo_classificacao && !d.classe) return { erro: "Informe o código de classificação.", campo: "codigo_classificacao" };
  if (emDemo()) return { aviso: AVISO_DEMO };

  const sb = await clienteSessao();
  if (!sb) return { erro: MENSAGEM_INDISPONIVEL };
  const { data, error } = await sb
    .from("caixas")
    .update({
      orgao: d.orgao,
      tipo: d.tipo,
      fundo: d.fundo,
      setor: d.setor,
      meses: d.meses,
      ano_limite: d.ano_limite,
      digitalizada: d.digitalizada,
      observacao: d.observacao,
      codigo_classificacao: d.codigo_classificacao,
      classe_id: d.classe,
      tipologia_id: d.tipologia,
      prazo_anos: d.prazo_anos,
      etiqueta_geral: d.etiqueta_geral,
    })
    .eq("id", d.id)
    .select("id");
  if (error) return { erro: mensagemDocumento(error.code) };
  if (!data?.length) return SEM_PERMISSAO;
  revalidatePath("/pesquisa");
  revalidatePath("/mapa");
  return { aviso: "Caixa cadastrada.", id: d.id };
}

// Código da classificação -> classe, grupo e prazo (o formulário preenche com isto).
export async function classeDoCodigo(codigo: string): Promise<ClasseDoCodigo | null> {
  await exigirSessao();
  if (!esquemaCodigoClasse.safeParse(codigo).success) return null;
  return classePorCodigo(codigo);
}

// Caixas de um nível, de qualquer tipo, para escolher qual cadastrar.
export async function listarCaixasCadastro(nivelId: string): Promise<CaixaDoNivel[]> {
  await exigirSessao();
  return z.guid().safeParse(nivelId).success ? caixasParaCadastro(nivelId) : [];
}
