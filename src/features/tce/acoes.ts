"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { clienteServico, clienteSessao } from "@/lib/supabase/servidor";
import { exigirSessao } from "@/features/sessao/dal";
import { MENSAGEM_INDISPONIVEL } from "@/features/login/esquemas";
import { AVISO_DEMO, emDemo } from "@/features/demo/dados";
import { configuracoes, importarPrefeitura } from "./rotina";

// Só administrador configura e importa; administrador ou coordenador confere.
// Erros do banco viram texto fixo e nada do conteúdo vai para log.

export type RetornoTce = { erro?: string; aviso?: string };
const SEM_PERMISSAO: RetornoTce = { erro: "Você não tem permissão para esta ação." };
const INVALIDO: RetornoTce = { erro: "Confira os dados e tente de novo." };
const uuid = z.guid();

const esquemaConfig = z.object({
  ativo: z.preprocess((v) => v === "on" || v === "true", z.boolean()),
  codigo: z.string().trim().regex(/^\d{1,10}$/, "Informe só números no código do município."),
  secretaria: uuid,
  anos: z.array(z.coerce.number().int().min(2000).max(2100)).min(1, "Escolha ao menos um ano.").max(10),
  tipos: z.array(z.enum(["licitacao", "contrato"])).min(1, "Escolha licitações, contratos ou os dois."),
});

export async function salvarConfiguracao(formData: FormData): Promise<RetornoTce> {
  const { usuario } = await exigirSessao();
  if (!usuario.administrador) return SEM_PERMISSAO;
  const r = esquemaConfig.safeParse({
    ativo: formData.get("ativo"),
    codigo: formData.get("codigo"),
    secretaria: formData.get("secretaria"),
    anos: formData.getAll("anos"),
    tipos: formData.getAll("tipos"),
  });
  if (!r.success) return { erro: r.error.issues[0].message };
  if (emDemo()) return { aviso: AVISO_DEMO };
  const sb = await clienteSessao();
  if (!sb) return { erro: MENSAGEM_INDISPONIVEL };
  const { error } = await sb.rpc("salvar_config_tce", {
    p_ativo: r.data.ativo,
    p_codigo: r.data.codigo,
    p_secretaria: r.data.secretaria,
    p_anos: r.data.anos,
    p_tipos: r.data.tipos,
  });
  if (error) return { erro: error.code === "42501" ? SEM_PERMISSAO.erro : "Não foi possível salvar. Tente de novo." };
  revalidatePath("/configuracoes/tce");
  return { aviso: "Configuração salva." };
}

const ERROS_ROTINA = {
  indisponivel: "O TCE está fora do ar. Tente mais tarde.",
  formato: "O TCE respondeu em um formato que o sistema não reconhece. A equipe LicCONT foi avisada.",
  sem_configuracao: "Complete e ligue a configuração antes de importar.",
  interno: "Não foi possível importar agora. Tente de novo.",
} as const;

// "Importar agora": a mesma rotina da noite, só para a prefeitura da pessoa.
export async function importarAgora(): Promise<RetornoTce> {
  const { usuario } = await exigirSessao();
  if (!usuario.administrador) return SEM_PERMISSAO;
  if (emDemo()) return { aviso: AVISO_DEMO };
  const servico = clienteServico();
  if (!servico) return { erro: MENSAGEM_INDISPONIVEL };
  const [cfg] = await configuracoes(servico, usuario.prefeituraId);
  if (!cfg) return { erro: ERROS_ROTINA.sem_configuracao };
  const r = await importarPrefeitura(servico, cfg, "manual");
  revalidatePath("/configuracoes/tce");
  revalidatePath("/importados");
  if (r.erro) return { erro: ERROS_ROTINA[r.erro] };
  return { aviso: `${r.novos} registros novos e ${r.duplicados} possíveis duplicados.` };
}

const esquemaConfirmar = z.object({ documento: uuid, secretaria: uuid, caixa: z.preprocess((v) => (v === "" ? null : v), uuid.nullable()) });

export async function confirmarImportado(formData: FormData): Promise<RetornoTce> {
  await exigirSessao();
  const r = esquemaConfirmar.safeParse(Object.fromEntries(formData));
  if (!r.success) return INVALIDO;
  if (emDemo()) return { aviso: AVISO_DEMO };
  const sb = await clienteSessao();
  if (!sb) return { erro: MENSAGEM_INDISPONIVEL };
  const { error } = await sb.rpc("confirmar_importado_tce", { p_documento: r.data.documento, p_secretaria: r.data.secretaria, p_caixa: r.data.caixa });
  if (error) {
    if (error.code === "42501") return SEM_PERMISSAO;
    return { erro: error.code === "LC004" ? "Esta caixa está desativada. Escolha outra." : "Não foi possível confirmar. Tente de novo." };
  }
  revalidatePath("/importados");
  revalidatePath("/pesquisa");
  return { aviso: "Documento conferido." };
}

const esquemaDecisao = z.object({ id: uuid, decisao: z.enum(["juntar", "manter"]) });

export async function decidirDuplicado(formData: FormData): Promise<RetornoTce> {
  const { usuario } = await exigirSessao();
  if (!usuario.administrador) return SEM_PERMISSAO;
  const r = esquemaDecisao.safeParse(Object.fromEntries(formData));
  if (!r.success) return INVALIDO;
  if (emDemo()) return { aviso: AVISO_DEMO };
  const sb = await clienteSessao();
  if (!sb) return { erro: MENSAGEM_INDISPONIVEL };
  const { error } = await sb.rpc("decidir_duplicado_tce", { p_duplicado: r.data.id, p_decisao: r.data.decisao });
  if (error) return { erro: error.code === "42501" ? SEM_PERMISSAO.erro : "Não foi possível salvar. Tente de novo." };
  revalidatePath("/importados");
  return { aviso: r.data.decisao === "juntar" ? "Juntado ao documento que já existia." : "Mantido separado." };
}
