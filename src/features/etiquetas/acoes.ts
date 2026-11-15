"use server";

import { clienteSessao } from "@/lib/supabase/servidor";
import { exigirSessao } from "@/features/sessao/dal";
import { MENSAGEM_INDISPONIVEL } from "@/features/login/esquemas";
import { AVISO_DEMO, emDemo } from "@/features/demo/dados";
import { podeCadastrar } from "@/features/documentos/dados";
import { esquemaImpressao } from "./esquemas";

// Registra que as etiquetas foram impressas: cria a linha da caixa (o código
// aleatório nasce no banco) e marca a data. O RLS confere prefeitura e papel de novo.
export type Retorno = { erro?: string; aviso?: string; ok?: boolean };

export async function registrarImpressao(entrada: unknown): Promise<Retorno> {
  const { usuario } = await exigirSessao();
  if (!(await podeCadastrar(usuario))) return { erro: "Você não tem permissão para esta ação." };
  const dados = esquemaImpressao.safeParse(entrada);
  if (!dados.success) return { erro: "Confira os dados e tente de novo." };
  if (emDemo()) return { aviso: AVISO_DEMO };

  const sb = await clienteSessao();
  if (!sb) return { erro: MENSAGEM_INDISPONIVEL };
  const { caixas, tamanho } = dados.data;
  const novas = await sb
    .from("etiquetas")
    .upsert(caixas.map((caixa_id) => ({ prefeitura_id: usuario.prefeituraId, caixa_id, tamanho })), { onConflict: "caixa_id", ignoreDuplicates: true });
  if (novas.error) return { erro: "Não foi possível registrar a impressão." };
  const marca = await sb.from("etiquetas").update({ tamanho, impressa_em: new Date().toISOString() }).in("caixa_id", caixas);
  if (marca.error) return { erro: "Não foi possível registrar a impressão." };
  return { ok: true };
}
