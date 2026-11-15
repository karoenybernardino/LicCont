"use server";

import { revalidatePath } from "next/cache";
import { clienteSessao } from "@/lib/supabase/servidor";
import { exigirAdmin, exigirSessao } from "@/features/sessao/dal";
import { MENSAGEM_INDISPONIVEL } from "@/features/login/esquemas";
import { AVISO_DEMO, emDemo } from "@/features/demo/dados";
import { pesquisar, proximaCaixaLivre, secretariasParaCadastro } from "@/features/documentos/dados";
import { lerFiltros } from "@/features/documentos/filtros";
import { tituloDocumento } from "@/features/documentos/titulo";
import { carregarEstrutura, podeCaixas } from "@/features/estrutura/dados";
import { mensagemErro } from "@/features/estrutura/esquemas";
import { proximaRua } from "@/features/estrutura/ocupacao";
import { detalheDaCaixa, ocupacaoDoGalpao, type DetalheCaixa, type OcupacaoCaixa } from "./dados";
import { esquemaAjusteModulos, esquemaBusca, esquemaCaixa, esquemaEscopo, esquemaMover, esquemaNovaRua, esquemaOcupacao, esquemaPlantaEntrada } from "./esquemas";
import { validarPlanta } from "./geometria";
import { GIROS } from "./tipos";

// Toda ação confere a permissão aqui e grava pela sessão da pessoa: o RLS e os
// gatilhos do banco conferem de novo prefeitura, secretaria e papel. Nenhum
// log leva conteúdo de documento.

export type Retorno = { erro?: string; aviso?: string };

const SEM_PERMISSAO: Retorno = { erro: "Você não tem permissão para esta ação." };
const INVALIDO: Retorno = { erro: "Confira os dados e tente de novo." };
const NAO_MOVEU = "Não foi possível mover. Nenhum documento foi movido.";

// ---------------------------------------------------------------------------
// Leituras sob demanda (caixa selecionada, ocupação, busca, próxima livre)
// ---------------------------------------------------------------------------
export async function lerCaixa(entrada: unknown): Promise<DetalheCaixa | null> {
  const { usuario } = await exigirSessao();
  const dados = esquemaCaixa.safeParse(entrada);
  if (!dados.success) return null;
  return detalheDaCaixa(usuario, dados.data.id);
}

export async function lerOcupacao(entrada: unknown): Promise<OcupacaoCaixa[]> {
  await exigirSessao();
  const dados = esquemaOcupacao.safeParse(entrada);
  if (!dados.success) return [];
  return ocupacaoDoGalpao(dados.data.galpao, dados.data.grande === true);
}

export type ResultadoBusca = { id: string; titulo: string; codigo: string }[];

// Número do processo digitado na busca do mapa: devolve o endereço da caixa.
export async function buscarNoMapa(entrada: unknown): Promise<ResultadoBusca> {
  const { usuario } = await exigirSessao();
  const dados = esquemaBusca.safeParse(entrada);
  if (!dados.success) return [];
  const r = await pesquisar(usuario, lerFiltros({ q: dados.data.q }));
  return r.itens.slice(0, 5).map((i) => ({ id: i.id, titulo: tituloDocumento(i), codigo: i.codigo }));
}

export async function proximaLivre(entrada: unknown): Promise<string | null> {
  await exigirSessao();
  const dados = esquemaEscopo.safeParse(entrada);
  return dados.success ? proximaCaixaLivre(dados.data) : null;
}

// ---------------------------------------------------------------------------
// Editor da planta (administrador e coordenador)
// ---------------------------------------------------------------------------
export async function salvarPlanta(entrada: unknown): Promise<Retorno> {
  const { usuario } = await exigirSessao();
  if (!(await podeCaixas(usuario))) return SEM_PERMISSAO;
  const dados = esquemaPlantaEntrada.safeParse(entrada);
  if (!dados.success) return INVALIDO;
  const p = dados.data;

  // Parede e sobreposição: a mesma função do leiaute, com o número de módulos de hoje.
  const e = await carregarEstrutura(p.galpao);
  if (e.galpao?.id !== p.galpao) return SEM_PERMISSAO;
  const modulos = (ruaId: string) => e.modulos.filter((m) => m.ativo && m.ruaId === ruaId).length;
  const ativas = e.ruas.filter((r) => r.ativo);
  const nomeDa = new Map(ativas.map((r) => [r.id, r.codigo]));
  if (p.ruas.some((r) => !nomeDa.has(r.id))) return SEM_PERMISSAO;
  const problemas = validarPlanta({
    largura: p.largura,
    profundidade: p.profundidade,
    metros: p.metrosCelula,
    ruas: p.ruas.map((r) => ({ id: r.id, codigo: nomeDa.get(r.id) as string, modulos: modulos(r.id), x: r.x, y: r.y, giro: r.giro, lados: r.lados })),
  });
  if (problemas.length) {
    const t = problemas[0];
    const cod = nomeDa.get(t.ruaId);
    return {
      erro:
        t.tipo === "fora"
          ? `Rua ${cod} passa da parede. Arraste para dentro do galpão ou gire 90° para salvar.`
          : `Rua ${cod} está sobre a Rua ${t.com}. Afaste uma delas para salvar.`,
    };
  }
  if (!p.elementos.every((x) => x.x + x.largura <= p.largura + 1e-6 && x.y + x.profundidade <= p.profundidade + 1e-6)) {
    return { erro: "Há elemento fora das paredes. Arraste para dentro do galpão para salvar." };
  }
  if (emDemo()) return { aviso: AVISO_DEMO };

  const sb = await clienteSessao();
  if (!sb) return { erro: MENSAGEM_INDISPONIVEL };
  const { error } = await sb.rpc("salvar_planta", {
    p_galpao: p.galpao,
    p_largura: p.largura,
    p_profundidade: p.profundidade,
    p_lado: p.entradaLado,
    p_posicao: p.entradaPosicao,
    p_metros: p.metrosCelula,
    p_ruas: p.ruas.map((r) => ({ id: r.id, x: r.x, y: r.y, giro: (GIROS as readonly number[]).includes(r.giro) ? r.giro : 0, lados: r.lados })),
    p_elementos: p.elementos.map((x) => ({ ...x, rotulo: x.rotulo || null })),
  });
  if (error) return { erro: error.code === "42501" ? SEM_PERMISSAO.erro : mensagemErro(error.code) };
  revalidatePath("/mapa", "layout");
  return { aviso: "Planta salva." };
}

// ---------------------------------------------------------------------------
// Mover documentos em lote (todos mudam ou nenhum muda)
// ---------------------------------------------------------------------------
export async function moverDocumentos(entrada: unknown): Promise<Retorno & { movidos?: number }> {
  const { usuario } = await exigirSessao();
  const dados = esquemaMover.safeParse(entrada);
  if (!dados.success) return INVALIDO;
  const { documentos, destino } = dados.data;
  const permitidas = new Set((await secretariasParaCadastro(usuario)).map((s) => s.id));
  if (!permitidas.size) return SEM_PERMISSAO;
  if (emDemo()) return { aviso: AVISO_DEMO };

  const sb = await clienteSessao();
  if (!sb) return { erro: MENSAGEM_INDISPONIVEL };
  // Cada documento precisa ser de uma secretaria em que a pessoa cadastra. Quem
  // não é visto pelo RLS some da lista e cai no mesmo erro (sem oráculo).
  const { data: linhas } = await sb.from("documentos").select("id, secretaria_id").in("id", documentos);
  if (!linhas || linhas.length !== documentos.length || linhas.some((l) => !permitidas.has(l.secretaria_id as string))) {
    return { erro: NAO_MOVEU };
  }
  const { data, error } = await sb.rpc("mover_documentos", { p_documentos: documentos, p_destino: destino });
  if (error) return { erro: error.code === "LC006" || error.code === "42501" ? NAO_MOVEU : mensagemErro(error.code) };
  revalidatePath("/pesquisa");
  const n = Number(data);
  return { aviso: n === 1 ? "1 documento movido." : `${n} documentos movidos.`, movidos: n };
}

// ---------------------------------------------------------------------------
// Estrutura pelo editor da planta (só administrador; o RLS confere de novo)
// ---------------------------------------------------------------------------
export async function criarRuaNaPlanta(entrada: unknown): Promise<Retorno> {
  const { usuario } = await exigirAdmin();
  const dados = esquemaNovaRua.safeParse(entrada);
  if (!dados.success) return INVALIDO;
  if (emDemo()) return { aviso: AVISO_DEMO };
  const sb = await clienteSessao();
  if (!sb) return { erro: MENSAGEM_INDISPONIVEL };
  const { galpao, modulos, niveis, capacidade } = dados.data;
  const { data: existentes, error: e0 } = await sb.from("ruas").select("codigo").eq("galpao_id", galpao);
  if (e0) return { erro: mensagemErro(e0.code) };
  const codigo = proximaRua((existentes ?? []).map((r) => r.codigo as string));
  if (!codigo) return { erro: "Este galpão já tem o máximo de ruas." };
  const { data: rua, error } = await sb.from("ruas").insert({ prefeitura_id: usuario.prefeituraId, galpao_id: galpao, codigo }).select("id").single();
  if (error || !rua) return { erro: mensagemErro(error?.code) };
  const { error: e2 } = await sb.rpc("adicionar_modulos", { p_rua: rua.id, p_modulos: modulos, p_niveis: niveis, p_capacidade: capacidade });
  revalidatePath("/mapa", "layout");
  revalidatePath("/estrutura", "layout");
  if (e2) return { erro: `Rua ${codigo} criada, mas os módulos não entraram. Adicione-os em Estrutura física.` };
  return { aviso: `Rua ${codigo} criada com ${modulos === 1 ? "1 módulo" : `${modulos} módulos`}.` };
}

// quantidade > 0 acrescenta módulos iguais ao último; < 0 desativa os últimos
// (o banco recusa se algum tiver documento).
export async function ajustarModulosDaRua(entrada: unknown): Promise<Retorno> {
  await exigirAdmin();
  const dados = esquemaAjusteModulos.safeParse(entrada);
  if (!dados.success) return INVALIDO;
  if (emDemo()) return { aviso: AVISO_DEMO };
  const sb = await clienteSessao();
  if (!sb) return { erro: MENSAGEM_INDISPONIVEL };
  const { rua, quantidade } = dados.data;
  const { data: mods, error } = await sb
    .from("modulos")
    .select("id, numero, niveis(numero, capacidade, ativo)")
    .eq("rua_id", rua)
    .eq("ativo", true)
    .order("numero");
  if (error) return { erro: mensagemErro(error.code) };
  if (!mods?.length) return SEM_PERMISSAO;
  if (quantidade > 0) {
    const ultimo = mods[mods.length - 1];
    const ativos = ((ultimo.niveis ?? []) as { numero: number; capacidade: number; ativo: boolean }[]).filter((n) => n.ativo);
    const niveis = Math.min(10, Math.max(1, ativos.length));
    const capacidade = Math.min(50, Math.max(1, ativos[0]?.capacidade ?? 20));
    const { error: e1 } = await sb.rpc("adicionar_modulos", { p_rua: rua, p_modulos: quantidade, p_niveis: niveis, p_capacidade: capacidade });
    if (e1) return { erro: mensagemErro(e1.code) };
  } else {
    const tirar = -quantidade;
    if (tirar >= mods.length) return { erro: "A rua precisa de pelo menos 1 módulo." };
    const ids = mods.slice(mods.length - tirar).map((m) => m.id as string);
    const { error: e2, data } = await sb.from("modulos").update({ ativo: false }).in("id", ids).select("id");
    if (e2) return { erro: mensagemErro(e2.code) };
    if (data?.length !== ids.length) return SEM_PERMISSAO;
  }
  revalidatePath("/mapa", "layout");
  revalidatePath("/estrutura", "layout");
  return { aviso: quantidade > 0 ? "Módulos adicionados." : "Módulos removidos." };
}
