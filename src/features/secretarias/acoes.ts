"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { clienteSessao } from "@/lib/supabase/servidor";
import { exigirAdmin } from "@/features/sessao/dal";
import { MENSAGEM_INDISPONIVEL, idSchema } from "@/features/login/esquemas";
import type { EstadoAcao } from "@/ui/formulario";
import { AVISO_DEMO, emDemo } from "@/features/demo/dados";
import { lerSecretaria } from "./esquemas";

// Mensagens fixas: nada do que a pessoa digitou volta no erro.
function mensagem(code?: string) {
  if (code === "23505") return "Já existe uma secretaria com este nome ou sigla.";
  if (code === "23503") return "Escolha um responsável e uma rua da lista.";
  return "Não foi possível salvar.";
}

// Grava pela sessão do administrador: o RLS confere prefeitura e aal2.
export async function cadastrarSecretaria(_: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const { usuario } = await exigirAdmin();
  if (emDemo()) return { aviso: AVISO_DEMO };
  const supabase = await clienteSessao();
  if (!supabase) return { erro: MENSAGEM_INDISPONIVEL };
  const dados = lerSecretaria(formData);
  if (!dados.success) return { erro: dados.error.issues[0].message };

  const { error } = await supabase.from("secretarias").insert({ prefeitura_id: usuario.prefeituraId, ...dados.data });
  if (error) return { erro: mensagem(error.code) };
  revalidatePath("/secretarias");
  if (formData.get("depois") === "outra") return { aviso: "Secretaria cadastrada. Pode cadastrar a próxima." };
  redirect("/secretarias");
}

export async function salvarSecretaria(_: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  await exigirAdmin();
  if (emDemo()) return { aviso: AVISO_DEMO };
  const supabase = await clienteSessao();
  if (!supabase) return { erro: MENSAGEM_INDISPONIVEL };
  const id = idSchema.safeParse(formData.get("id"));
  const dados = lerSecretaria(formData);
  if (!id.success) return { erro: "Não foi possível salvar." };
  if (!dados.success) return { erro: dados.error.issues[0].message };

  const { data, error } = await supabase.from("secretarias").update(dados.data).eq("id", id.data).select("id");
  if (error) return { erro: mensagem(error.code) };
  if (!data?.length) return { erro: "Não foi possível salvar." };
  revalidatePath("/secretarias");
  redirect("/secretarias");
}
