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
import { lerValor } from "@/features/documentos/formato";

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

// Valor em reais ("1.500,00") -> centavos; vazio -> null.
const reais = z.string().trim().transform((v, ctx) => {
  const n = lerValor(v);
  if (n === null) return null;
  if (Number.isNaN(n) || n < 0 || n > 1_000_000) { ctx.addIssue({ code: "custom", message: "Valor inválido." }); return z.NEVER; }
  return Math.round(n * 100);
});
const esquemaContrato = z.object({
  plano: z.literal("completo", "Escolha o plano."),
  valor_implantacao_centavos: reais,
  valor_mensalidade_centavos: reais,
  contrato_inicio: z.string().trim().transform((v) => v || null).pipe(z.iso.date("Data do contrato inválida.").nullable()),
  tce_ativo: z.preprocess((v) => v === "on" || v === "true", z.boolean()),
  tce_codigo_municipio: z.string().trim().transform((v) => v || null).pipe(z.string().regex(/^d{1,10}$/, "O código do município tem só números.").nullable()),
});
const lerContrato = (f: FormData) =>
  esquemaContrato.safeParse({
    plano: f.get("plano") ?? "completo",
    valor_implantacao_centavos: f.get("valor_implantacao") ?? "",
    valor_mensalidade_centavos: f.get("valor_mensalidade") ?? "",
    contrato_inicio: f.get("contrato_inicio") ?? "",
    tce_ativo: f.get("tce_ativo"),
    tce_codigo_municipio: f.get("tce_codigo_municipio") ?? "",
  });

const esquemaAdmin = z.object({
  nome: z.string().trim().min(2, "Informe o nome do administrador.").max(200),
  email: emailSchema,
});

// Cria a conta e vincula como primeiro administrador (a função do banco só aceita
// prefeitura sem usuários e nunca alguém da equipe). Sem e-mail de convite:
// devolve a senha provisória, mostrada uma única vez.
async function criarAdmin(supabase: NonNullable<Awaited<ReturnType<typeof clienteSessao>>>, servico: NonNullable<ReturnType<typeof clienteServico>>, prefeitura: string, nome: string, email: string, funcao: "cadastrar_primeiro_admin" | "equipe_incluir_admin" = "cadastrar_primeiro_admin") {
  const senha = senhaProvisoria();
  const { data, error } = await servico.auth.admin.createUser({ email, password: senha, email_confirm: true });
  if (error || !data.user) {
    return { erro: error?.code === "email_exists" ? "Não foi possível cadastrar este e-mail. Use outro e-mail institucional." : FALHA };
  }
  const { error: erroAdmin } = await supabase.rpc(funcao, { p_prefeitura: prefeitura, p_usuario: data.user.id, p_nome: nome });
  if (erroAdmin) {
    await servico.auth.admin.deleteUser(data.user.id);
    return { erro: erroAdmin.code === "42501" ? "Não foi possível: esta prefeitura já tem usuários." : erroAdmin.code === "23514" ? "Esta prefeitura já tem 5 administradores ativos." : FALHA };
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
  const contrato = lerContrato(formData);
  if (!contrato.success) return { erro: contrato.error.issues[0].message };
  if (contrato.data.tce_ativo && !contrato.data.tce_codigo_municipio) return { erro: "Informe o código do município para ligar o TCE-CE." };
  const situacaoInicial = statusSchema.safeParse(formData.get("status") ?? "implantacao");
  if (!situacaoInicial.success) return { erro: FALHA };
  const nomeAdmin = String(formData.get("admin_nome") ?? "").trim();
  const emailAdmin = String(formData.get("admin_email") ?? "").trim();
  const comAdmin = nomeAdmin !== "" || emailAdmin !== "";
  const admin = comAdmin ? esquemaAdmin.safeParse({ nome: nomeAdmin, email: emailAdmin }) : null;
  if (admin && !admin.success) return { erro: admin.error.issues[0].message };
  const servico = clienteServico();
  if (admin && !servico) return { erro: MENSAGEM_INDISPONIVEL };

  const { data: criada, error } = await supabase.from("prefeituras").insert({ ...dados.data, ...contrato.data, status: situacaoInicial.data }).select("id").single();
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
  // Sem revalidar: a página trocaria o formulário pela tabela e a senha (mostrada uma vez) sumiria.
  return { aviso: "Primeiro administrador cadastrado.", senha: r.senha };
}

// "Editar dados" da prefeitura: nome, CNPJ, contrato e TCE-CE.
export async function atualizarPrefeitura(_: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const supabase = await contexto();
  if (emDemo()) return { aviso: AVISO_DEMO };
  if (!supabase) return { erro: MENSAGEM_INDISPONIVEL };
  const id = idSchema.safeParse(formData.get("id"));
  const dados = esquemaPrefeitura.safeParse({ nome: formData.get("nome"), cnpj: formData.get("cnpj") ?? "" });
  const contrato = lerContrato(formData);
  if (!id.success) return { erro: FALHA };
  if (!dados.success) return { erro: dados.error.issues[0].message };
  if (!contrato.success) return { erro: contrato.error.issues[0].message };
  if (contrato.data.tce_ativo && !contrato.data.tce_codigo_municipio) return { erro: "Informe o código do município para ligar o TCE-CE." };
  const { data, error } = await supabase.from("prefeituras").update({ ...dados.data, ...contrato.data }).eq("id", id.data).select("id");
  if (error || !data?.length) return { erro: error?.code === "23505" ? "Já existe uma prefeitura com este CNPJ." : FALHA };
  revalidatePath("/equipe", "layout");
  return { aviso: "Dados atualizados." };
}

// Outro administrador (além do primeiro): até 5 ativos. Senha provisória mostrada uma vez.
export async function convidarAdmin(_: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const supabase = await contexto();
  if (emDemo()) return { aviso: AVISO_DEMO };
  const servico = clienteServico();
  if (!supabase || !servico) return { erro: MENSAGEM_INDISPONIVEL };
  const id = idSchema.safeParse(formData.get("id"));
  const admin = esquemaAdmin.safeParse({ nome: formData.get("nome"), email: formData.get("email") });
  if (!id.success) return { erro: FALHA };
  if (!admin.success) return { erro: admin.error.issues[0].message };
  const r = await criarAdmin(supabase, servico, id.data, admin.data.nome, admin.data.email, "equipe_incluir_admin");
  if ("erro" in r) return { erro: r.erro };
  // Sem revalidar: a senha (mostrada uma vez) sumiria com o formulário.
  return { aviso: "Administrador cadastrado.", senha: r.senha };
}

// Desativa um administrador (a conta continua, sem acesso). Só a equipe.
export async function removerAdmin(formData: FormData): Promise<void> {
  const supabase = await contexto();
  const prefeitura = idSchema.safeParse(formData.get("prefeitura"));
  const usuario = idSchema.safeParse(formData.get("usuario"));
  if (!prefeitura.success) return;
  if (!emDemo() && supabase && usuario.success) {
    await supabase.rpc("equipe_desativar_admin", { p_prefeitura: prefeitura.data, p_usuario: usuario.data });
  }
  revalidatePath("/equipe", "layout");
  redirect(`/equipe/${prefeitura.data}?aba=administradores`);
}
