"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { clienteSessao } from "@/lib/supabase/servidor";
import { exigirSessao } from "@/features/sessao/dal";
import { MENSAGEM_INDISPONIVEL } from "@/features/login/esquemas";
import { AVISO_DEMO, emDemo } from "@/features/demo/dados";
import { secretariasParaCadastro } from "@/features/documentos/dados";
import { errosParaLinhasCsv, validarLinhas, type ErroLinha } from "./validar";
import { ErroPlanilha, LIMITE_BYTES_PLANILHA, lerPlanilha, paraCsv } from "./planilha";
import { faltando, mapaSeguro, sugerirMapa, type Mapa } from "./colunas";
import { processosExistentes } from "./dados";

// Só administrador importa. O arquivo é lido de novo a cada etapa (nada fica
// guardado no servidor entre etapas). Nunca vai nome de arquivo nem conteúdo
// de célula para log ou mensagem de erro.

export type RetornoImportacao = {
  erro?: string;
  aviso?: string;
  cabecalhos?: string[];
  amostra?: string[][];
  sugestao?: Mapa;
  faltando?: string[];
  conferencia?: { total: number; prontas: number; comProblema: number; repetidas: number; erros: ErroLinha[]; errosCsv: string };
  lote?: { gravados: number; pulados: number; comProblema: number; semEndereco: number };
};

const SEM_PERMISSAO: RetornoImportacao = { erro: "Só o administrador importa documentos." };
const INVALIDO: RetornoImportacao = { erro: "Confira os dados e tente de novo." };
const uuid = z.guid();

async function arquivoDoForm(f: FormData) {
  const a = f.get("arquivo");
  if (!(a instanceof File) || a.size === 0) return null;
  if (a.size > LIMITE_BYTES_PLANILHA) throw new ErroPlanilha("A planilha passa de 10 MB. Divida em partes menores.");
  return { nome: a.name, bytes: new Uint8Array(await a.arrayBuffer()) };
}

// etapa "ler": devolve títulos, amostra e a sugestão de colunas.
// etapa "conferir": valida sem gravar. etapa "gravar": cria o lote e grava.
export async function processarPlanilha(formData: FormData): Promise<RetornoImportacao> {
  const { usuario } = await exigirSessao();
  if (!usuario.administrador) return SEM_PERMISSAO;
  const etapa = formData.get("etapa");
  if (etapa !== "ler" && etapa !== "conferir" && etapa !== "gravar") return INVALIDO;

  let planilha;
  let nome = "";
  try {
    const arq = await arquivoDoForm(formData);
    if (!arq) return { erro: "Escolha a planilha." };
    nome = arq.nome;
    planilha = await lerPlanilha(arq.nome, arq.bytes);
  } catch (e) {
    return { erro: e instanceof ErroPlanilha ? e.message : INVALIDO.erro };
  }

  const sugestao = sugerirMapa(planilha.cabecalhos);
  if (etapa === "ler") {
    return { cabecalhos: planilha.cabecalhos, amostra: planilha.linhas.slice(0, 3), sugestao };
  }

  let mapa: Mapa | null;
  try {
    mapa = mapaSeguro(JSON.parse(String(formData.get("mapa") ?? "null")), planilha.cabecalhos.length);
  } catch {
    mapa = null;
  }
  if (!mapa) return INVALIDO;
  const destinoBruto = formData.get("destino");
  const permitidas = await secretariasParaCadastro(usuario);
  const destino = typeof destinoBruto === "string" && destinoBruto ? permitidas.find((s) => s.id === destinoBruto) : undefined;
  if (destinoBruto && !destino) return { erro: "Escolha uma secretaria da lista." };
  const falta = faltando(mapa).filter((r) => !(destino && r === "Secretaria"));
  if (falta.length) return { faltando: falta, erro: "Falta casar colunas obrigatórias." };

  const anos = [...new Set(planilha.linhas.map((l) => Number(mapa.ano === undefined ? NaN : l[mapa.ano])).filter((n) => Number.isInteger(n)))];
  const conf = validarLinhas(planilha.linhas, mapa, permitidas.map((s) => ({ id: s.id, nome: s.nome })), await processosExistentes(anos), destino);
  const resumo = {
    total: conf.total,
    prontas: conf.validas.length,
    comProblema: new Set(conf.erros.map((e) => e.linha)).size,
    repetidas: conf.repetidas.length,
    erros: conf.erros.slice(0, 20),
    errosCsv: paraCsv(errosParaLinhasCsv(conf.erros)),
  };
  if (etapa === "conferir") return { conferencia: resumo };

  if (!conf.validas.length) return { erro: "Nenhuma linha pode ser importada. Corrija a planilha." };
  if (emDemo()) return { aviso: AVISO_DEMO, conferencia: resumo };
  const sb = await clienteSessao();
  if (!sb) return { erro: MENSAGEM_INDISPONIVEL };
  const { data: id, error } = await sb.rpc("criar_lote_importacao", { p_nome_arquivo: nome.slice(0, 200), p_total: conf.total });
  if (error || !id) return { erro: mensagemImportacao(error?.code) };
  const { data, error: erroGravar } = await sb.rpc("gravar_lote_importacao", { p_lote: id, p_linhas: conf.validas.map((v) => v.dados) });
  if (erroGravar) return { erro: mensagemImportacao(erroGravar.code) };
  revalidatePath("/pesquisa");
  revalidatePath("/inicio");
  revalidatePath("/importar");
  const r = data as { gravados: number; pulados: number };
  return {
    conferencia: resumo,
    lote: { gravados: r.gravados, pulados: r.pulados + conf.repetidas.length, comProblema: resumo.comProblema, semEndereco: r.gravados },
  };
}

export async function desfazerLote(formData: FormData): Promise<RetornoImportacao> {
  const { usuario } = await exigirSessao();
  if (!usuario.administrador) return SEM_PERMISSAO;
  const id = uuid.safeParse(formData.get("id"));
  if (!id.success) return INVALIDO;
  if (emDemo()) return { aviso: AVISO_DEMO };
  const sb = await clienteSessao();
  if (!sb) return { erro: MENSAGEM_INDISPONIVEL };
  const { data, error } = await sb.rpc("desfazer_lote_importacao", { p_lote: id.data });
  if (error) return { erro: mensagemImportacao(error.code) };
  revalidatePath("/importar");
  revalidatePath("/pesquisa");
  return { aviso: `${data ?? 0} documentos sem endereço foram desativados. Os que já têm caixa ficaram onde estão.` };
}

// Localizar: põe documentos importados (ainda sem caixa) numa caixa. Quem
// cadastra na secretaria do documento pode; o banco confere de novo (RLS e
// gatilhos). Documento que já tem caixa não muda por aqui.
const esquemaLocalizar = z.object({ ids: z.array(uuid).min(1).max(200), caixa: uuid });

export async function localizarDocumentos(entrada: { ids: string[]; caixa: string }): Promise<RetornoImportacao & { movidos?: number }> {
  const { usuario } = await exigirSessao();
  const dados = esquemaLocalizar.safeParse(entrada);
  if (!dados.success) return INVALIDO;
  const permitidas = new Set((await secretariasParaCadastro(usuario)).map((s) => s.id));
  if (!permitidas.size) return { erro: "Você não tem permissão para esta ação." };
  if (emDemo()) return { aviso: AVISO_DEMO };
  const sb = await clienteSessao();
  if (!sb) return { erro: MENSAGEM_INDISPONIVEL };
  const { data: sem } = await sb.from("documentos").select("id, secretaria_id").in("id", dados.data.ids).is("caixa_id", null).eq("ativo", true);
  const alvos = (sem ?? []).filter((d) => permitidas.has(d.secretaria_id as string)).map((d) => d.id as string);
  if (!alvos.length) return { erro: "Nenhum dos documentos escolhidos pode ser localizado por você." };
  const { data: caixa } = await sb.rpc("ocupacao_caixas", { p_caixas: [dados.data.caixa] });
  const c = (caixa as { documentos: number; capacidade: number }[] | null)?.[0];
  if (!c) return { erro: "A caixa escolhida não é válida." };
  if (c.documentos + alvos.length > c.capacidade) return { erro: `A caixa tem ${c.capacidade - c.documentos} vagas e você escolheu ${alvos.length} documentos.` };
  const { data, error } = await sb.from("documentos").update({ caixa_id: dados.data.caixa }).in("id", alvos).is("caixa_id", null).select("id");
  if (error) return { erro: error.code === "LC004" ? "Esta caixa está desativada. Escolha outra." : "Não foi possível localizar. Tente de novo." };
  revalidatePath("/cadastro/localizar");
  revalidatePath("/pesquisa");
  revalidatePath("/mapa");
  return { aviso: `${data?.length ?? 0} documentos localizados.`, movidos: data?.length ?? 0 };
}

// Erros do banco -> texto fixo.
function mensagemImportacao(codigo: string | undefined) {
  switch (codigo) {
    case "42501":
      return "Você não tem permissão para esta ação.";
    case "23514":
      return "Este lote não pode mais ser alterado.";
    default:
      return "Não foi possível importar. Tente de novo.";
  }
}
