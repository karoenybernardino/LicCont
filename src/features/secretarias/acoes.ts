"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { clienteSessao } from "@/lib/supabase/servidor";
import { exigirAdmin } from "@/features/sessao/dal";
import { MENSAGEM_INDISPONIVEL, idSchema } from "@/features/login/esquemas";
import type { EstadoAcao } from "@/ui/formulario";

const nomeSchema = z.string().trim().min(2, "Informe o nome da secretaria.").max(120, "Nome muito longo.");

// Grava pela sessão do administrador: o RLS confere prefeitura e aal2.
export async function cadastrarSecretaria(_: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const { usuario } = await exigirAdmin();
  const supabase = await clienteSessao();
  if (!supabase) return { erro: MENSAGEM_INDISPONIVEL };
  const nome = nomeSchema.safeParse(formData.get("nome"));
  if (!nome.success) return { erro: nome.error.issues[0].message };

  const { error } = await supabase
    .from("secretarias")
    .insert({ prefeitura_id: usuario.prefeituraId, nome: nome.data });
  if (error) {
    return { erro: error.code === "23505" ? "Já existe uma secretaria com este nome." : "Não foi possível salvar." };
  }
  revalidatePath("/secretarias");
  return { aviso: "Secretaria cadastrada." };
}

export async function alternarSecretaria(_: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  await exigirAdmin();
  const supabase = await clienteSessao();
  if (!supabase) return { erro: MENSAGEM_INDISPONIVEL };
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return { erro: "Não foi possível salvar." };
  const ativa = formData.get("ativa") === "sim";

  const { data, error } = await supabase.from("secretarias").update({ ativa }).eq("id", id.data).select("id");
  if (error || !data?.length) return { erro: "Não foi possível salvar." };
  revalidatePath("/secretarias");
  return { aviso: ativa ? "Secretaria reativada." : "Secretaria desativada." };
}
