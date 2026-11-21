"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { clienteServico, clienteSessao } from "@/lib/supabase/servidor";
import { exigirSessao } from "@/features/sessao/dal";
import { MENSAGEM_INDISPONIVEL } from "@/features/login/esquemas";
import { AVISO_DEMO, emDemo } from "@/features/demo/dados";
import { caixasComOcupacao, limitePdfMb, podeConferir, posicaoDaCaixa, proximaCaixaLivre, secretariasParaCadastro, type CaixaOcupada } from "./dados";
import { Conferidor, MOTIVOS, type Motivo } from "./conferencia";
import { esquemaDocumento, esquemaEnvio, esquemaId, mensagemDocumento } from "./esquemas";

// Toda ação confere a permissão aqui e grava pela sessão da pessoa: o RLS e
// os gatilhos do banco conferem de novo prefeitura, secretaria e papel.
// Nunca vai nome de arquivo nem conteúdo para log.

export type Retorno = { erro?: string; aviso?: string; id?: string; campo?: string };

const SEM_PERMISSAO: Retorno = { erro: "Você não tem permissão para esta ação." };
const INVALIDO: Retorno = { erro: "Confira os dados e tente de novo." };

function atualizar(id?: string) {
  revalidatePath("/pesquisa");
  revalidatePath("/inicio");
  if (id) revalidatePath(`/documentos/${id}`);
}

// Cria (sem "id") ou edita (com "id") o documento. A secretaria não muda na edição.
export async function salvarDocumento(formData: FormData): Promise<Retorno> {
  const { usuario } = await exigirSessao();
  const dados = esquemaDocumento.safeParse(Object.fromEntries(formData));
  if (!dados.success) return { erro: dados.error.issues[0].message, campo: String(dados.error.issues[0].path[0] ?? "") };
  const d = dados.data;
  const idEdicao = formData.get("id");
  const editar = typeof idEdicao === "string" && idEdicao !== "";
  if (editar && !esquemaId.safeParse({ id: idEdicao }).success) return INVALIDO;

  const permitidas = await secretariasParaCadastro(usuario);
  if (!permitidas.some((s) => s.id === d.secretaria)) return SEM_PERMISSAO;
  if (emDemo()) return { aviso: AVISO_DEMO };

  const sb = await clienteSessao();
  if (!sb) return { erro: MENSAGEM_INDISPONIVEL };
  const campos = {
    caixa_id: d.caixa,
    modalidade: d.modalidade,
    numero: d.numero,
    ano: d.ano,
    objeto: d.objeto,
    titulo_processo: d.titulo_processo,
    orgao: d.orgao,
    classe_id: d.classe,
    tipologia_id: d.tipologia,
    observacao: d.observacao,
    volume: d.volume,
  };
  if (editar) {
    const { data, error } = await sb.from("documentos").update(campos).eq("id", idEdicao as string).select("id");
    if (error) return { erro: mensagemDocumento(error.code) };
    if (!data?.length) return SEM_PERMISSAO;
    atualizar(idEdicao as string);
    return { aviso: "Documento atualizado.", id: idEdicao as string };
  }
  const { data, error } = await sb
    .from("documentos")
    .insert({ prefeitura_id: usuario.prefeituraId, secretaria_id: d.secretaria, tipo: d.tipo, ...campos })
    .select("id")
    .single();
  if (error || !data) return { erro: mensagemDocumento(error?.code) };
  atualizar();
  return { aviso: "Documento cadastrado.", id: data.id };
}

async function mudarDocumento(id: string, campos: Record<string, unknown>, aviso: string): Promise<Retorno> {
  const { usuario } = await exigirSessao();
  if (!esquemaId.safeParse({ id }).success) return INVALIDO;
  if (emDemo()) return { aviso: AVISO_DEMO };
  const sb = await clienteSessao();
  if (!sb) return { erro: MENSAGEM_INDISPONIVEL };
  const { data: doc } = await sb.from("documentos").select("secretaria_id").eq("id", id).maybeSingle();
  if (!doc || !(await podeConferir(usuario, doc.secretaria_id as string))) return SEM_PERMISSAO;
  const { data, error } = await sb.from("documentos").update(campos).eq("id", id).select("id");
  if (error) return { erro: mensagemDocumento(error.code) };
  if (!data?.length) return SEM_PERMISSAO;
  atualizar(id);
  return { aviso, id };
}

export async function conferirDocumento(id: string, conferido: boolean) {
  return mudarDocumento(id, { conferido_em: conferido ? new Date().toISOString() : null }, conferido ? "Marcado como conferido." : "Conferência removida.");
}

export async function desativarDocumento(id: string, ativo: boolean) {
  return mudarDocumento(id, { ativo }, ativo ? "Documento reativado." : "Documento desativado.");
}

// ---------------------------------------------------------------------------
// Envio do PDF: do navegador direto ao Storage (o servidor só autoriza e confere)
// ---------------------------------------------------------------------------

export type Envio =
  | { erro: string }
  | { arquivoId: string; urlPdf: string; urlMiniatura: string | null; limiteMb: number };

// Envios sem conferência há mais de 1 hora: o banco marca "recusado" e o servidor apaga os objetos.
async function limparEnviosAbandonados(usuarioId: string) {
  const servico = clienteServico();
  if (!servico) return;
  const { data } = await servico.rpc("limpar_envios", { p_usuario: usuarioId });
  const velhos = (data ?? []) as { caminho: string; miniatura: string }[];
  if (!velhos.length) return;
  await servico.storage.from("acervo").remove(velhos.map((v) => v.caminho));
  await servico.storage.from("miniaturas").remove(velhos.map((v) => v.miniatura));
}

export async function iniciarEnvio(entrada: { documento: string; nome: string; tamanho: number; miniatura: boolean }): Promise<Envio> {
  const { usuario } = await exigirSessao();
  const dados = esquemaEnvio.safeParse(entrada);
  if (!dados.success) return { erro: "Arquivo inválido." };
  if (emDemo()) return { erro: AVISO_DEMO };
  const sb = await clienteSessao();
  if (!sb) return { erro: MENSAGEM_INDISPONIVEL };

  const limiteMb = await limitePdfMb(usuario);
  if (dados.data.tamanho > limiteMb * 1024 * 1024) return { erro: MOTIVOS.grande_demais };

  const { data: doc } = await sb.from("documentos").select("secretaria_id").eq("id", dados.data.documento).maybeSingle();
  if (!doc) return { erro: "Você não tem permissão para esta ação." };
  await limparEnviosAbandonados(usuario.id);
  const { data: arq, error } = await sb
    .from("arquivos")
    .insert({
      prefeitura_id: usuario.prefeituraId,
      secretaria_id: doc.secretaria_id,
      documento_id: dados.data.documento,
      nome_original: dados.data.nome,
      tamanho: dados.data.tamanho,
    })
    .select("id, caminho")
    .single();
  if (error || !arq) return { erro: mensagemDocumento(error?.code) };

  const pdf = await sb.storage.from("acervo").createSignedUploadUrl(arq.caminho as string);
  if (pdf.error || !pdf.data) return { erro: MENSAGEM_INDISPONIVEL };
  let urlMiniatura: string | null = null;
  if (entrada.miniatura) {
    const caminho = (arq.caminho as string).replace(/\.pdf$/, ".webp");
    const mini = await sb.storage.from("miniaturas").createSignedUploadUrl(caminho);
    urlMiniatura = mini.data?.signedUrl ?? null;
  }
  return { arquivoId: arq.id as string, urlPdf: pdf.data.signedUrl, urlMiniatura, limiteMb };
}

const PARTE = 4 * 1024 * 1024;

const esquemaConferir = z.object({
  arquivo: z.guid(),
  paginas: z.number().int().min(1).max(100000),
  avisos: z.array(z.enum(["resolucao_baixa", "sem_pdfa"])).max(2),
  miniatura: z.boolean(),
});

export type ResultadoConferencia = { ok: true } | { ok: false; erro: string };

// Lê o PDF enviado em partes (HTTP Range), confere e conclui. Se recusar,
// o objeto é apagado.
export async function conferirEnvio(entrada: z.infer<typeof esquemaConferir>): Promise<ResultadoConferencia> {
  const { usuario } = await exigirSessao();
  const dados = esquemaConferir.safeParse(entrada);
  if (!dados.success) return { ok: false, erro: "Arquivo inválido." };
  if (emDemo()) return { ok: false, erro: AVISO_DEMO };
  const sb = await clienteSessao();
  if (!sb) return { ok: false, erro: MENSAGEM_INDISPONIVEL };

  const { data: arq } = await sb
    .from("arquivos")
    .select("caminho, situacao, enviado_por")
    .eq("id", dados.data.arquivo)
    .maybeSingle();
  if (!arq || arq.enviado_por !== usuario.id || arq.situacao !== "enviando") return { ok: false, erro: "Você não tem permissão para esta ação." };
  const { error: errMarca } = await sb.rpc("marcar_conferindo", { p_arquivo: dados.data.arquivo });
  if (errMarca) return { ok: false, erro: "Você não tem permissão para esta ação." };

  const limite = (await limitePdfMb(usuario)) * 1024 * 1024;

  let motivo: Motivo | null = null;
  const conf = new Conferidor(limite);
  try {
    const link = await sb.storage.from("acervo").createSignedUrl(arq.caminho as string, 120);
    if (link.error || !link.data) throw new Error("sem link");
    let inicio = 0;
    let total = Infinity;
    while (inicio < total) {
      const r = await fetch(link.data.signedUrl, { headers: { Range: `bytes=${inicio}-${inicio + PARTE - 1}` }, cache: "no-store" });
      if (!r.ok && r.status !== 206) throw new Error("falha");
      const corpo = new Uint8Array(await r.arrayBuffer());
      const faixa = /\/(\d+)$/.exec(r.headers.get("content-range") ?? "");
      total = faixa ? Number(faixa[1]) : corpo.length;
      conf.add(corpo);
      inicio += corpo.length;
      if (!corpo.length || inicio > limite) break;
    }
  } catch {
    motivo = "incompleto";
  }
  const res = motivo ? ({ ok: false, motivo } as const) : conf.fim();
  // Só o servidor conclui (service_role): o hash e o tamanho saíram da leitura acima.
  const servico = clienteServico();
  if (!servico) return { ok: false, erro: MENSAGEM_INDISPONIVEL };
  const { data: motivoBanco, error } = await servico.rpc("concluir_conferencia", {
    p_usuario: usuario.id,
    p_arquivo: dados.data.arquivo,
    p_pronto: res.ok,
    p_sha256: res.ok ? res.sha256 : null,
    p_tamanho: res.ok ? res.tamanho : 0,
    p_paginas: dados.data.paginas,
    p_motivo: res.ok ? null : res.motivo,
    p_avisos: res.ok ? dados.data.avisos : [],
    p_miniatura: res.ok && dados.data.miniatura,
  });
  if (error) return { ok: false, erro: MENSAGEM_INDISPONIVEL };
  // O banco também recusa (ex.: sem espaço); vale o motivo dele.
  const motivoFinal = res.ok ? (motivoBanco as Motivo | null) : res.motivo;
  if (motivoFinal) {
    await sb.storage.from("acervo").remove([arq.caminho as string]);
    await sb.storage.from("miniaturas").remove([(arq.caminho as string).replace(/\.pdf$/, ".webp")]);
    return { ok: false, erro: MOTIVOS[motivoFinal] ?? MENSAGEM_INDISPONIVEL };
  }
  atualizar();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Links do PDF (valem 5 minutos; quem lê o documento pode abrir e baixar)
// ---------------------------------------------------------------------------
export async function linkDoPdf(documentoId: string, baixar: boolean): Promise<{ url?: string; erro?: string }> {
  await exigirSessao();
  if (!esquemaId.safeParse({ id: documentoId }).success) return { erro: "Arquivo inválido." };
  if (emDemo()) return { url: "/demo/documento-de-demonstracao.pdf" };
  const sb = await clienteSessao();
  if (!sb) return { erro: MENSAGEM_INDISPONIVEL };
  const { data: arq } = await sb
    .from("arquivos")
    .select("id, caminho, nome_original")
    .eq("documento_id", documentoId)
    .eq("ativo", true)
    .eq("situacao", "pronto")
    .maybeSingle();
  if (!arq) return { erro: "Este documento não tem PDF." };
  const { data, error } = await sb.storage
    .from("acervo")
    .createSignedUrl(arq.caminho as string, 300, baixar ? { download: arq.nome_original as string } : undefined);
  if (error || !data) return { erro: MENSAGEM_INDISPONIVEL };
  // Trilha de acesso: quem abriu ou baixou (só o id do arquivo, nunca o nome).
  await sb.rpc("registrar_auditoria", { p_acao: baixar ? "arquivos.baixar" : "arquivos.ver", p_alvo_tabela: "arquivos", p_alvo_id: arq.id as string });
  return { url: data.signedUrl };
}

// Metadados do Decreto 10.278/2020 que a pessoa preenche (os técnicos já vêm do envio: hash,
// data, responsável, identificador). Só quem cadastra na secretaria; o banco confere de novo.
const esquemaMetadados = z.object({
  arquivo: z.guid(),
  titulo: z.string().trim().max(200),
  assunto: z.string().trim().max(300),
  autor: z.string().trim().max(200),
  local: z.string().trim().max(200),
  genero: z.enum(["textual", "iconografico", "cartografico", "sonoro", "audiovisual", "outro"]),
  selo: z.enum(["consulta", "valor_legal"]),
});

export async function salvarMetadadosArquivo(entrada: unknown): Promise<Retorno> {
  await exigirSessao();
  const d = esquemaMetadados.safeParse(entrada);
  if (!d.success) return INVALIDO;
  if (emDemo()) return { aviso: AVISO_DEMO };
  const sb = await clienteSessao();
  if (!sb) return { erro: MENSAGEM_INDISPONIVEL };
  const { error } = await sb.rpc("salvar_metadados_arquivo", {
    p_arquivo: d.data.arquivo, p_titulo: d.data.titulo, p_assunto: d.data.assunto, p_autor: d.data.autor, p_local: d.data.local, p_genero: d.data.genero, p_selo: d.data.selo,
  });
  if (error) return { erro: error.code === "42501" ? "Você não tem permissão para esta ação." : "Não foi possível salvar. Tente de novo." };
  atualizar();
  return { aviso: "Metadados salvos." };
}

// Miniatura da 1ª página (link de 5 minutos).
export async function linkDaMiniatura(documentoId: string): Promise<string | null> {
  await exigirSessao();
  if (emDemo() || !esquemaId.safeParse({ id: documentoId }).success) return null;
  const sb = await clienteSessao();
  if (!sb) return null;
  const { data: arq } = await sb
    .from("arquivos")
    .select("miniatura_caminho")
    .eq("documento_id", documentoId)
    .eq("ativo", true)
    .maybeSingle();
  if (!arq?.miniatura_caminho) return null;
  const { data } = await sb.storage.from("miniaturas").createSignedUrl(arq.miniatura_caminho as string, 300);
  return data?.signedUrl ?? null;
}

// Caixas de um nível, com a ocupação, para as listas dependentes do cadastro.
export async function listarCaixas(nivelId: string): Promise<CaixaOcupada[]> {
  await exigirSessao();
  if (!z.guid().safeParse(nivelId).success) return [];
  return caixasComOcupacao(nivelId);
}

export async function caixaLivre(escopo: { nivel?: string; modulo?: string; rua?: string }): Promise<string | null> {
  await exigirSessao();
  const e = z.object({ nivel: z.guid().optional(), modulo: z.guid().optional(), rua: z.guid().optional() }).safeParse(escopo);
  return e.success ? proximaCaixaLivre(e.data) : null;
}

export async function posicaoDaCaixaAcao(caixaId: string) {
  await exigirSessao();
  return z.guid().safeParse(caixaId).success ? posicaoDaCaixa(caixaId) : null;
}

// ---------------------------------------------------------------------------
// Texto do PDF lido por OCR no navegador (busca dentro do PDF). O texto vai
// direto ao banco pela função, que confere papel, prazo e arquivo; nunca vai
// para log nem para a auditoria.
// ---------------------------------------------------------------------------
const esquemaTexto = z.object({
  arquivo: z.guid(),
  texto: z.string().min(1).max(300_000),
  paginas: z.number().int().min(1).max(100000),
});

export async function salvarTextoPdf(entrada: unknown): Promise<{ ok: boolean; erro?: string }> {
  await exigirSessao();
  const dados = esquemaTexto.safeParse(entrada);
  if (!dados.success) return { ok: false, erro: "Texto inválido." };
  if (emDemo()) return { ok: false, erro: AVISO_DEMO };
  const sb = await clienteSessao();
  if (!sb) return { ok: false, erro: MENSAGEM_INDISPONIVEL };
  const { error } = await sb.rpc("salvar_texto_pdf", { p_arquivo: dados.data.arquivo, p_texto: dados.data.texto, p_paginas: dados.data.paginas });
  if (error) return { ok: false, erro: error.code === "42501" ? "Você não tem permissão para esta ação." : "Não foi possível salvar o texto." };
  atualizar();
  return { ok: true };
}
