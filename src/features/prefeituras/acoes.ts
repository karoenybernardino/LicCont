"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { clienteServico, clienteSessao } from "@/lib/supabase/servidor";
import { exigirEquipe } from "@/features/sessao/dal";
import { MENSAGEM_INDISPONIVEL, idSchema } from "@/features/login/esquemas";
import { emailSchema, senhaProvisoria } from "@/features/usuarios/esquemas";
import type { EstadoAcao } from "@/ui/formulario";
import { AVISO_DEMO, emDemo } from "@/features/demo/dados";

const FALHA = "Não foi possível salvar. Tente de novo.";
const statusSchema = z.enum(["implantacao", "ativa", "suspensa"]);

const esquemaPrefeitura = z.object({
  nome: z.string().trim().min(3, "Informe o nome do órgão.").max(200, "Nome muito longo."),
  cnpj: z
    .string()
    .transform((v) => v.replace(/\D/g, ""))
    .pipe(z.string().length(14, "O CNPJ tem 14 números.")),
});

// Só equipe LicCONT com segundo fator (exigirEquipe). Grava pela sessão: o
// RLS confere app.eh_equipe() (aal2) de novo.
async function contexto() {
  await exigirEquipe();
  return clienteSessao();
}

export async function cadastrarPrefeitura(_: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const supabase = await contexto();
  if (emDemo()) return { aviso: AVISO_DEMO };
  if (!supabase) return { erro: MENSAGEM_INDISPONIVEL };
  const dados = esquemaPrefeitura.safeParse({ nome: formData.get("nome"), cnpj: formData.get("cnpj") ?? "" });
  if (!dados.success) return { erro: dados.error.issues[0].message };

  const { error } = await supabase.from("prefeituras").insert(dados.data);
  if (error) return { erro: error.code === "23505" ? "Já existe uma prefeitura com este CNPJ." : FALHA };
  revalidatePath("/equipe");
  return { aviso: "Prefeitura cadastrada, em implantação." };
}

export async function mudarStatus(_: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const supabase = await contexto();
  if (emDemo()) return { aviso: AVISO_DEMO };
  if (!supabase) return { erro: MENSAGEM_INDISPONIVEL };
  const id = idSchema.safeParse(formData.get("id"));
  const status = statusSchema.safeParse(formData.get("status"));
  if (!id.success || !status.success) return { erro: FALHA };

  const { data, error } = await supabase
    .from("prefeituras")
    .update({ status: status.data })
    .eq("id", id.data)
    .select("id");
  if (error || !data?.length) return { erro: FALHA };
  revalidatePath("/equipe");
  return { aviso: "Situação atualizada." };
}

export async function cadastrarPrimeiroAdmin(_: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const supabase = await contexto();
  if (emDemo()) return { aviso: AVISO_DEMO };
  const servico = clienteServico();
  if (!supabase || !servico) return { erro: MENSAGEM_INDISPONIVEL };
  const id = idSchema.safeParse(formData.get("id"));
  const nome = z.string().trim().min(2, "Informe o nome.").max(200).safeParse(formData.get("nome"));
  const email = emailSchema.safeParse(formData.get("email"));
  if (!id.success) return { erro: FALHA };
  if (!nome.success) return { erro: nome.error.issues[0].message };
  if (!email.success) return { erro: email.error.issues[0].message };

  const senha = senhaProvisoria();
  const { data, error } = await servico.auth.admin.createUser({ email: email.data, password: senha, email_confirm: true });
  if (error || !data.user) {
    return {
      erro:
        error?.code === "email_exists"
          ? "Não foi possível cadastrar este e-mail. Use outro e-mail institucional."
          : FALHA,
    };
  }
  // A função do banco só aceita prefeitura sem usuários e nunca alguém da equipe.
  const { error: erroAdmin } = await supabase.rpc("cadastrar_primeiro_admin", {
    p_prefeitura: id.data,
    p_usuario: data.user.id,
    p_nome: nome.data,
  });
  if (erroAdmin) {
    await servico.auth.admin.deleteUser(data.user.id);
    return {
      erro: erroAdmin.code === "42501" ? "Não foi possível: esta prefeitura já tem usuários." : FALHA,
    };
  }
  return { aviso: "Primeiro administrador cadastrado.", senha };
}
