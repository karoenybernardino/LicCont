"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { clienteSessao } from "@/lib/supabase/servidor";
import { membroEquipe, usuarioAtual } from "@/features/sessao/dal";
import { MENSAGEM_INDISPONIVEL } from "@/features/login/esquemas";
import { AVISO_DEMO, emDemo } from "@/features/demo/dados";
import { ErroPlanilha, LIMITE_BYTES_PLANILHA, lerPlanilha } from "@/features/importacao/planilha";
import { mensagemDoBanco } from "./regras";

// A tabela de temporalidade é gravada pela equipe LicCONT (qualquer órgão) ou pelo
// administrador do próprio órgão. O banco confere de novo (app.pode_editar_classes).
// Mensagens fixas: nunca o conteúdo das células nem o nome do arquivo.

export type RetornoClasses = { erro?: string; aviso?: string; resumo?: { inseridas: number; atualizadas: number; removidas: number; desativadas: number } };

const uuid = z.guid();

// Órgão em que a pessoa pode mexer: o seu (administrador) ou o escolhido (equipe).
async function orgaoEditavel(prefeitura: unknown): Promise<string | null> {
  const u = await usuarioAtual();
  if (u?.administrador) return u.prefeituraId;
  if (await membroEquipe()) {
    const id = uuid.safeParse(prefeitura);
    return id.success ? id.data : null;
  }
  return null;
}

const linha = z.object({
  codigo: z.string().trim().regex(/^[0-9A-Za-z.-]{1,20}$/, "Código inválido."),
  nome: z.string().trim().min(2, "Informe o nome da classe.").max(160, "Nome da classe muito longo."),
  grupo: z.string().trim().min(1, "Escolha o grupo.").max(80),
  tipologias: z.string().trim().max(500).default(""),
  prazo_corrente: z.number().int().min(0).max(99),
  prazo_intermediaria: z.number().int().min(0).max(99),
  tipo_prazo: z.enum(["fixo", "apos_evento", "permanente"]),
  evento: z.string().trim().max(80).default(""),
  destinacao: z.enum(["eliminacao", "guarda_permanente"]),
  observacao: z.string().trim().max(500).default(""),
});

const entradaSalvar = z.object({
  prefeitura: z.unknown(),
  linhas: z.array(linha).min(1, "Nenhuma linha para salvar.").max(500, "No máximo 500 linhas por vez."),
  substituir: z.boolean(),
});

export async function salvarClasses(entrada: unknown): Promise<RetornoClasses> {
  const dados = entradaSalvar.safeParse(entrada);
  if (!dados.success) return { erro: dados.error.issues[0].message };
  const orgao = await orgaoEditavel(dados.data.prefeitura);
  if (!orgao) return { erro: "Você não tem permissão para esta ação." };
  const erro = dados.data.linhas.find((l) => (l.tipo_prazo === "apos_evento" && l.evento.length < 2) || (l.tipo_prazo !== "permanente" && l.prazo_corrente + l.prazo_intermediaria < 1));
  if (erro) return { erro: "Confira o prazo e o evento de cada linha." };
  if (emDemo()) return { aviso: AVISO_DEMO };
  const sb = await clienteSessao();
  if (!sb) return { erro: MENSAGEM_INDISPONIVEL };
  const { data, error } = await sb.rpc("classes_salvar", { p_prefeitura: orgao, p_linhas: dados.data.linhas, p_substituir: dados.data.substituir });
  if (error) {
    return { erro: error.code === "22023" ? "Confira o grupo, o prazo e o evento de cada linha." : error.code === "23514" || error.code === "23505" ? "Confira os dados: código repetido ou prazo incoerente." : mensagemDoBanco(error.code) };
  }
  revalidatePath("/temporalidade");
  revalidatePath("/configuracoes/temporalidade");
  revalidatePath("/equipe", "layout");
  const r = data as { inseridas: number; atualizadas: number; removidas: number; desativadas: number };
  return { aviso: "Tabela salva.", resumo: r };
}

export async function excluirClasse(entrada: unknown): Promise<RetornoClasses> {
  const dados = z.object({ id: uuid }).safeParse(entrada);
  if (!dados.success) return { erro: "Não foi possível concluir. Tente de novo." };
  if (!(await usuarioAtual())?.administrador && !(await membroEquipe())) return { erro: "Você não tem permissão para esta ação." };
  if (emDemo()) return { aviso: AVISO_DEMO };
  const sb = await clienteSessao();
  if (!sb) return { erro: MENSAGEM_INDISPONIVEL };
  const { data, error } = await sb.rpc("classe_excluir", { p_classe: dados.data.id });
  if (error) return { erro: mensagemDoBanco(error.code) };
  revalidatePath("/temporalidade");
  revalidatePath("/configuracoes/temporalidade");
  revalidatePath("/equipe", "layout");
  return { aviso: data === "desativada" ? "A classe já tem caixa ou documento ligado: foi desativada, não excluída." : "Classe excluída." };
}

export type TabelaLida = { erro?: string; cabecalhos?: string[]; linhas?: string[][] };

// .xlsx e .csv são lidos aqui (texto puro, sem fórmulas); o PDF é lido no navegador.
export async function lerTabelaEnviada(formData: FormData): Promise<TabelaLida> {
  if (!(await usuarioAtual())?.administrador && !(await membroEquipe())) return { erro: "Você não tem permissão para esta ação." };
  const a = formData.get("arquivo");
  if (!(a instanceof File) || a.size === 0) return { erro: "Escolha um arquivo." };
  if (a.size > LIMITE_BYTES_PLANILHA) return { erro: "A planilha passa de 10 MB. Divida em partes menores." };
  try {
    const p = await lerPlanilha(a.name, new Uint8Array(await a.arrayBuffer()));
    return { cabecalhos: p.cabecalhos, linhas: p.linhas };
  } catch (e) {
    return { erro: e instanceof ErroPlanilha ? e.message : "Não foi possível ler a planilha." };
  }
}
