"use server";

import { revalidatePath } from "next/cache";
import { clienteSessao } from "@/lib/supabase/servidor";
import { exigirAdmin, exigirSessao } from "@/features/sessao/dal";
import { MENSAGEM_INDISPONIVEL } from "@/features/login/esquemas";
import type { EstadoAcao } from "@/ui/formulario";
import { AVISO_DEMO, emDemo } from "@/features/demo/dados";
import { esquemaEdital, esquemaId, esquemaModelo, esquemaTermo } from "./esquemas";
import { mensagemDoBanco } from "./regras";

// Mensagens fixas por código do banco: nada do documento nem de pessoa volta no erro.
// O banco confere papel, prefeitura, secretaria e prazo de novo (public.descarte_*).

export type RetornoTermo = { erro?: string; aviso?: string; id?: string };

// Salva o texto-base e as assinaturas do termo da prefeitura. Só administrador.
export async function salvarModelo(_: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const { usuario } = await exigirAdmin();
  const dados = esquemaModelo.safeParse({ tipo: formData.get("tipo"), baseLegal: formData.get("baseLegal"), assinaturas: formData.get("assinaturas") });
  if (!dados.success) return { erro: dados.error.issues[0].message };
  if (emDemo()) return { aviso: AVISO_DEMO };
  const sb = await clienteSessao();
  if (!sb) return { erro: MENSAGEM_INDISPONIVEL };
  const campos = { base_legal: dados.data.baseLegal, assinaturas: dados.data.assinaturas };
  const alterou = await sb.from("modelos_termo").update(campos).eq("tipo", dados.data.tipo).select("id");
  if (alterou.error) return { erro: mensagemDoBanco(alterou.error.code) };
  if (!alterou.data?.length) {
    const novo = await sb.from("modelos_termo").insert({ prefeitura_id: usuario.prefeituraId, tipo: dados.data.tipo, ...campos });
    if (novo.error) return { erro: mensagemDoBanco(novo.error.code) };
  }
  revalidatePath("/temporalidade", "layout");
  return { aviso: "Modelo salvo. Vale para os próximos PDFs e Words." };
}

// Gera o termo em rascunho com os documentos marcados (todos de uma secretaria).
export async function gerarTermo(entrada: unknown): Promise<RetornoTermo> {
  await exigirSessao();
  if (emDemo()) return { aviso: AVISO_DEMO };
  const dados = esquemaTermo.safeParse(entrada);
  if (!dados.success) return { erro: dados.error.issues[0].message };
  const sb = await clienteSessao();
  if (!sb) return { erro: MENSAGEM_INDISPONIVEL };
  const { documentos, observacao } = dados.data;
  const { data: docs, error: erroDocs } = await sb.from("documentos").select("secretaria_id").in("id", documentos);
  if (erroDocs) return { erro: mensagemDoBanco(erroDocs.code) };
  const secretarias = new Set((docs ?? []).map((d) => d.secretaria_id as string));
  if (secretarias.size !== 1 || docs?.length !== documentos.length) return { erro: mensagemDoBanco("LD002") };
  const { data, error } = await sb.rpc("descarte_criar", { p_secretaria: [...secretarias][0], p_documentos: documentos, p_observacao: observacao });
  if (error) return { erro: mensagemDoBanco(error.code, error.message) };
  revalidatePath("/temporalidade");
  return { id: data as string };
}

async function etapa(
  chamada: "descarte_publicar_edital" | "descarte_aprovar" | "descarte_cancelar",
  argumentos: Record<string, unknown>,
  aviso: string,
): Promise<EstadoAcao> {
  await exigirSessao();
  if (emDemo()) return { aviso: AVISO_DEMO };
  const sb = await clienteSessao();
  if (!sb) return { erro: MENSAGEM_INDISPONIVEL };
  const { error } = await sb.rpc(chamada, argumentos);
  if (error) return { erro: mensagemDoBanco(error.code, error.message) };
  revalidatePath("/temporalidade", "layout");
  revalidatePath("/inicio");
  return { aviso };
}

export async function publicarEdital(_: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const dados = esquemaEdital.safeParse({ id: formData.get("id"), data: formData.get("data") });
  if (!dados.success) return { erro: dados.error.issues[0].message };
  return etapa("descarte_publicar_edital", { p_descarte: dados.data.id, p_data: dados.data.data }, "Edital registrado. O prazo de ciência começou.");
}

export async function aprovarTermo(_: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const dados = esquemaId.safeParse({ id: formData.get("id") });
  if (!dados.success) return { erro: "Não foi possível concluir. Tente de novo." };
  return etapa("descarte_aprovar", { p_descarte: dados.data.id }, "Termo aprovado. Os documentos foram desativados e o registro ficou na auditoria.");
}

export async function cancelarTermo(_: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const dados = esquemaId.safeParse({ id: formData.get("id") });
  if (!dados.success) return { erro: "Não foi possível concluir. Tente de novo." };
  return etapa("descarte_cancelar", { p_descarte: dados.data.id }, "Termo cancelado. Os documentos voltaram à fila.");
}
