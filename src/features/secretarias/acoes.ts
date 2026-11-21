"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { clienteSessao } from "@/lib/supabase/servidor";
import { exigirEquipe } from "@/features/sessao/dal";
import { MENSAGEM_INDISPONIVEL, idSchema } from "@/features/login/esquemas";
import type { EstadoAcao } from "@/ui/formulario";
import { AVISO_DEMO, emDemo } from "@/features/demo/dados";
import { lerSecretaria, type DadosSecretaria } from "./esquemas";

// Mensagens fixas: nada do que a pessoa digitou volta no erro.
function mensagem(code?: string) {
  if (code === "23505") return "Já existe uma secretaria com este nome ou sigla.";
  if (code === "23503") return "Escolha um responsável e uma rua da lista.";
  return "Não foi possível salvar.";
}

// Só a equipe LicCONT (com segundo fator) cadastra e edita secretarias, pela
// função do banco, que confere a equipe de novo e a prefeitura do cadastro.
const params = (prefeitura: string, id: string | null, d: DadosSecretaria) => ({
  p_prefeitura: prefeitura, p_id: id, p_nome: d.nome, p_sigla: d.sigla, p_ativa: d.ativa, p_telefone: d.telefone,
  p_email_contato: d.email_contato, p_responsavel_id: d.responsavel_id, p_cargo: d.cargo_responsavel,
  p_recebe_licitacoes: d.recebe_licitacoes, p_recebe_contratos: d.recebe_contratos,
  p_exige_aprovacao: d.exige_aprovacao_emprestimo, p_avisar_atrasos: d.avisar_atrasos,
  p_prazo: d.prazo_emprestimo_dias, p_rua: d.rua_preferencial_id,
});

async function gravar(formData: FormData, id: string | null): Promise<EstadoAcao & { prefeitura?: string }> {
  await exigirEquipe();
  if (emDemo()) return { aviso: AVISO_DEMO };
  const supabase = await clienteSessao();
  if (!supabase) return { erro: MENSAGEM_INDISPONIVEL };
  const prefeitura = idSchema.safeParse(formData.get("prefeitura"));
  const dados = lerSecretaria(formData);
  if (!prefeitura.success) return { erro: "Não foi possível salvar." };
  if (!dados.success) return { erro: dados.error.issues[0].message };
  const { data, error } = await supabase.rpc("equipe_salvar_secretaria", params(prefeitura.data, id, dados.data));
  if (error) return { erro: mensagem(error.code) };
  if (!data) return { erro: "Não foi possível salvar." };
  revalidatePath("/equipe", "layout");
  return { prefeitura: prefeitura.data };
}

const volta = (prefeitura: string) => `/equipe/${prefeitura}?aba=secretarias`;

export async function cadastrarSecretaria(_: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const r = await gravar(formData, null);
  if (!r.prefeitura) return r;
  if (formData.get("depois") === "outra") return { aviso: "Secretaria cadastrada. Pode cadastrar a próxima." };
  redirect(volta(r.prefeitura));
}

export async function salvarSecretaria(_: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return { erro: "Não foi possível salvar." };
  const r = await gravar(formData, id.data);
  if (!r.prefeitura) return r;
  redirect(volta(r.prefeitura));
}
