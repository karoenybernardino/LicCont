"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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

const esquemaAdmin = z.object({
  nome: z.string().trim().min(2, "Informe o nome do administrador.").max(200),
  email: emailSchema,
});

// Cria a conta e vincula como primeiro administrador (a função do banco só aceita
// prefeitura sem usuários e nunca alguém da equipe). Sem e-mail de convite:
// devolve a senha provisória, mostrada uma única vez.
async function criarAdmin(supabase: NonNullable<Awaited<ReturnType<typeof clienteSessao>>>, servico: NonNullable<ReturnType<typeof clienteServico>>, prefeitura: string, nome: string, email: string) {
  const senha = senhaProvisoria();
  const { data, error } = await servico.auth.admin.createUser({ email, password: senha, email_confirm: true });
  if (error || !data.user) {
    return { erro: error?.code === "email_exists" ? "Não foi possível cadastrar este e-mail. Use outro e-mail institucional." : FALHA };
  }
  const { error: erroAdmin } = await supabase.rpc("cadastrar_primeiro_admin", { p_prefeitura: prefeitura, p_usuario: data.user.id, p_nome: nome });
  if (erroAdmin) {
    await servico.auth.admin.deleteUser(data.user.id);
    return { erro: erroAdmin.code === "42501" ? "Não foi possível: esta prefeitura já tem usuários." : FALHA };
  }
  return { senha };
}

// Tela "Nova prefeitura": cria a prefeitura e, se informado, o primeiro administrador.
export async function criarPrefeitura(_: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const supabase = await contexto();
  if (emDemo()) return { aviso: AVISO_DEMO };
  if (!supabase) return { erro: MENSAGEM_INDISPONIVEL };
  const dados = esquemaPrefeitura.safeParse({ nome: formData.get("nome"), cnpj: formData.get("cnpj") ?? "" });
  if (!dados.success) return { erro: dados.error.issues[0].message };
  const nomeAdmin = String(formData.get("admin_nome") ?? "").trim();
  const emailAdmin = String(formData.get("admin_email") ?? "").trim();
  const comAdmin = nomeAdmin !== "" || emailAdmin !== "";
  const admin = comAdmin ? esquemaAdmin.safeParse({ nome: nomeAdmin, email: emailAdmin }) : null;
  if (admin && !admin.success) return { erro: admin.error.issues[0].message };
  const servico = clienteServico();
  if (admin && !servico) return { erro: MENSAGEM_INDISPONIVEL };

  const { data: criada, error } = await supabase.from("prefeituras").insert(dados.data).select("id").single();
  if (error || !criada) return { erro: error?.code === "23505" ? "Já existe uma prefeitura com este CNPJ." : FALHA };
  revalidatePath("/equipe");
  if (!admin?.success || !servico) redirect(`/equipe/${criada.id}`);

  const r = await criarAdmin(supabase, servico, criada.id, admin.data.nome, admin.data.email);
  if ("erro" in r) return { erro: `Prefeitura criada, mas o administrador não foi cadastrado. ${r.erro} Cadastre-o na página da prefeitura.` };
  return { aviso: "Prefeitura criada e administrador cadastrado. Anote a senha: ela não aparece de novo.", senha: r.senha };
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
  revalidatePath(`/equipe/${id.data}`);
  return { aviso: "Situação atualizada." };
}

export async function cadastrarPrimeiroAdmin(_: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const supabase = await contexto();
  if (emDemo()) return { aviso: AVISO_DEMO };
  const servico = clienteServico();
  if (!supabase || !servico) return { erro: MENSAGEM_INDISPONIVEL };
  const id = idSchema.safeParse(formData.get("id"));
  const admin = esquemaAdmin.safeParse({ nome: formData.get("nome"), email: formData.get("email") });
  if (!id.success) return { erro: FALHA };
  if (!admin.success) return { erro: admin.error.issues[0].message };
  const r = await criarAdmin(supabase, servico, id.data, admin.data.nome, admin.data.email);
  if ("erro" in r) return { erro: r.erro };
  revalidatePath(`/equipe/${id.data}`);
  return { aviso: "Primeiro administrador cadastrado.", senha: r.senha };
}
