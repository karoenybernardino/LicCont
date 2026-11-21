"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { clienteServico, clienteSessao } from "@/lib/supabase/servidor";
import { exigirEquipe, membroEquipe } from "@/features/sessao/dal";
import { MENSAGEM_INDISPONIVEL, idSchema } from "@/features/login/esquemas";
import { emailSchema, senhaProvisoria } from "@/features/usuarios/esquemas";
import type { EstadoAcao } from "@/ui/formulario";
import { AVISO_DEMO, emDemo } from "@/features/demo/dados";
import { exigirDono } from "./dados";

const FALHA = "Não foi possível salvar. Tente de novo.";
const EMAIL_RECUSADO = "Não foi possível cadastrar este e-mail. Se a pessoa já usa o LicCONT em outro órgão, use outro e-mail.";
const nomeSchema = z.string().trim().min(2, "Informe o nome.").max(200, "Nome muito longo.");

// Quem chama: a equipe LicCONT (com 2º fator) ou o dono da empresa. O banco confere de novo em toda função.
async function quemChama() {
  return (await membroEquipe()) ? { equipe: true as const, eu: null } : { equipe: false as const, eu: await exigirDono() };
}

// Convite: cria a conta com senha provisória e o vínculo. Nenhum e-mail sai (o serviço de e-mail ainda
// não tem chave); a senha provisória aparece uma vez na tela, como no cadastro de usuários da prefeitura.
export async function convidarPessoa(_: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const q = await quemChama();
  if (q.equipe) await exigirEquipe();
  if (emDemo()) return { aviso: AVISO_DEMO };
  const supabase = await clienteSessao();
  const servico = clienteServico();
  if (!supabase || !servico) return { erro: MENSAGEM_INDISPONIVEL };
  const nome = nomeSchema.safeParse(formData.get("nome"));
  const email = emailSchema.safeParse(formData.get("email"));
  if (!nome.success) return { erro: nome.error.issues[0].message };
  if (!email.success) return { erro: email.error.issues[0].message };
  let parceira: string;
  let papel: "dono" | "funcionario" = "funcionario";
  if (q.equipe) {
    const p = idSchema.safeParse(formData.get("parceira"));
    if (!p.success) return { erro: FALHA };
    parceira = p.data;
    if (formData.get("papel") === "dono") papel = "dono";
  } else {
    parceira = q.eu!.parceiraId;
  }

  const senha = senhaProvisoria();
  const { data, error } = await servico.auth.admin.createUser({ email: email.data, password: senha, email_confirm: true });
  if (error || !data.user) return { erro: error?.code === "email_exists" ? EMAIL_RECUSADO : FALHA };
  const { data: id, error: erroBanco } = await supabase.rpc("parceira_incluir_pessoa", { p_parceira: parceira, p_usuario: data.user.id, p_nome: nome.data, p_papel: papel });
  if (erroBanco || !id) {
    await servico.auth.admin.deleteUser(data.user.id); // desfaz: a conta não fica solta
    return { erro: erroBanco?.code === "23505" ? "Esta empresa já tem um dono." : FALHA };
  }
  revalidatePath("/parceira", "layout");
  revalidatePath("/equipe", "layout");
  return { aviso: "Pessoa cadastrada. Passe a senha provisória a ela; será trocada no primeiro acesso.", senha };
}

// Troca toda a alocação do funcionário pelas prefeituras marcadas.
export async function alocarPessoa(_: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const q = await quemChama();
  if (q.equipe) await exigirEquipe();
  if (emDemo()) return { aviso: AVISO_DEMO };
  const supabase = await clienteSessao();
  if (!supabase) return { erro: MENSAGEM_INDISPONIVEL };
  const pessoa = idSchema.safeParse(formData.get("pessoa"));
  const prefeituras = z.array(idSchema).max(500).safeParse(formData.getAll("prefeitura"));
  if (!pessoa.success || !prefeituras.success) return { erro: FALHA };
  const { data, error } = await supabase.rpc("parceira_alocar", { p_pessoa: pessoa.data, p_prefeituras: prefeituras.data });
  if (error || !data) return { erro: FALHA };
  revalidatePath("/parceira", "layout");
  revalidatePath("/equipe", "layout");
  return { aviso: "Alocação salva." };
}

export async function ativarPessoa(formData: FormData): Promise<void> {
  const q = await quemChama();
  if (q.equipe) await exigirEquipe();
  if (emDemo()) return;
  const supabase = await clienteSessao();
  const pessoa = idSchema.safeParse(formData.get("pessoa"));
  if (!supabase || !pessoa.success) return;
  await supabase.rpc("parceira_ativar", { p_pessoa: pessoa.data, p_ativa: formData.get("ativa") === "sim" });
  revalidatePath("/parceira", "layout");
  revalidatePath("/equipe", "layout");
}
