"use server";

import { revalidatePath } from "next/cache";
import { clienteSessao } from "@/lib/supabase/servidor";
import { exigirSessao } from "@/features/sessao/dal";
import { MENSAGEM_INDISPONIVEL } from "@/features/login/esquemas";
import { AVISO_DEMO, emDemo } from "@/features/demo/dados";
import { secretariasParaCadastro } from "@/features/documentos/dados";
import { esquemaDecisao, esquemaDevolucao, esquemaEmprestimo } from "./esquemas";

// Registrar e devolver passam por funções do banco, que conferem prefeitura,
// secretaria e papel de novo. Nome e setor de quem retirou nunca vão para log.
export type Retorno = { erro?: string; aviso?: string; ok?: boolean; campo?: string };

const SEM_PERMISSAO: Retorno = { erro: "Você não tem permissão para esta ação." };

function atualizar() {
  for (const rota of ["/emprestimos", "/inicio", "/pesquisa", "/mapa", "/auditoria"]) revalidatePath(rota);
}

// Erros do banco conhecidos -> texto da tela (sem repetir dado da pessoa).
function mensagem(codigo: string | undefined): string {
  if (codigo === "42501") return SEM_PERMISSAO.erro as string;
  if (codigo === "LE001") return "Esta secretaria exige aprovação: faça o pedido.";
  if (codigo === "23505") return "Este documento já está emprestado.";
  if (codigo === "23514") return "Confira o documento e as datas: ele precisa estar ativo e o prazo ter até 60 dias.";
  return "Não foi possível salvar. Tente de novo.";
}

export async function registrarEmprestimo(formData: FormData): Promise<Retorno> {
  const { usuario } = await exigirSessao();
  const dados = esquemaEmprestimo.safeParse(Object.fromEntries(formData));
  if (!dados.success) return { erro: dados.error.issues[0].message, campo: String(dados.error.issues[0].path[0] ?? "") };
  if (usuario.parceira || (await secretariasParaCadastro(usuario)).length === 0) return SEM_PERMISSAO;
  if (emDemo()) return { aviso: AVISO_DEMO };

  const sb = await clienteSessao();
  if (!sb) return { erro: MENSAGEM_INDISPONIVEL };
  const d = dados.data;
  // Secretaria que exige aprovação: vira pedido; o prazo só conta da aprovação.
  const { data: doc } = await sb.from("documentos").select("secretarias(exige_aprovacao_emprestimo)").eq("id", d.documento).maybeSingle();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((doc as any)?.secretarias?.exige_aprovacao_emprestimo) {
    const dias = Math.round((Date.parse(`${d.prazo}T00:00:00Z`) - Date.parse(`${d.retirada}T00:00:00Z`)) / 86_400_000);
    const { error: erroPedido } = await sb.rpc("pedir_emprestimo", { p_documento: d.documento, p_nome: d.nome, p_setor: d.setor, p_prazo_dias: Math.max(1, dias), p_observacao: d.observacao || null });
    if (erroPedido) return { erro: mensagem(erroPedido.code) };
    atualizar();
    return { ok: true, aviso: "Pedido enviado para aprovação do coordenador da secretaria." };
  }
  const { error } = await sb.rpc("registrar_emprestimo", {
    p_documento: d.documento, p_nome: d.nome, p_setor: d.setor, p_retirada: d.retirada, p_prazo: d.prazo, p_observacao: d.observacao || null,
  });
  if (error) return { erro: mensagem(error.code) };
  atualizar();
  return { ok: true };
}

export async function devolverEmprestimo(entrada: unknown): Promise<Retorno> {
  const { usuario } = await exigirSessao();
  const dados = esquemaDevolucao.safeParse(entrada);
  if (!dados.success) return { erro: "Confira os dados e tente de novo." };
  if (usuario.parceira || (await secretariasParaCadastro(usuario)).length === 0) return SEM_PERMISSAO;
  if (emDemo()) return { aviso: AVISO_DEMO };

  const sb = await clienteSessao();
  if (!sb) return { erro: MENSAGEM_INDISPONIVEL };
  const { error } = await sb.rpc("devolver_emprestimo", { p_emprestimo: dados.data.id });
  if (error) return { erro: error.code === "23514" ? "Este empréstimo já foi devolvido." : mensagem(error.code) };
  atualizar();
  return { ok: true };
}

// Aprovar ou recusar um pedido. O banco confere o papel e que quem aprova não é quem pediu.
export async function decidirPedido(entrada: unknown): Promise<Retorno> {
  const { usuario } = await exigirSessao();
  if (usuario.parceira) return SEM_PERMISSAO;
  const dados = esquemaDecisao.safeParse(entrada);
  if (!dados.success) return { erro: "Confira os dados e tente de novo." };
  if (emDemo()) return { aviso: AVISO_DEMO };
  const sb = await clienteSessao();
  if (!sb) return { erro: MENSAGEM_INDISPONIVEL };
  const { error } = dados.data.acao === "aprovar"
    ? await sb.rpc("aprovar_pedido_emprestimo", { p_pedido: dados.data.id })
    : await sb.rpc("recusar_pedido_emprestimo", { p_pedido: dados.data.id });
  if (error) return { erro: error.code === "23514" ? "Este pedido já foi decidido ou venceu (3 dias)." : error.code === "23505" ? "Este documento já está emprestado." : mensagem(error.code) };
  atualizar();
  return { ok: true };
}
