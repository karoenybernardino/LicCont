"use server";

import { createHmac } from "node:crypto";
import { clienteServico } from "@/lib/supabase/servidor";
import { AVISO_DEMO, emDemo } from "@/features/demo/dados";
import type { EstadoAcao } from "@/ui/formulario";
import { lerPedido } from "./pedido";

// Nenhum dado do formulário vai para log ou mensagem de erro.
const FALHA = "Não foi possível enviar agora. Tente de novo em alguns minutos.";

export async function pedirDemonstracao(_: EstadoAcao, dados: FormData): Promise<EstadoAcao> {
  if (emDemo()) return { aviso: AVISO_DEMO };
  const r = lerPedido(dados);
  if (!r.success) {
    // Isca preenchida: finge que deu certo.
    if (String(dados.get("empresa_site") ?? "") !== "") return { aviso: "Pedido recebido. Respondemos em breve." };
    return { erro: r.error.issues[0]?.message ?? "Confira os dados e tente de novo." };
  }
  const p = r.data;
  const sb = clienteServico();
  const segredo = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!sb || !segredo) return { erro: FALHA };
  const hash = createHmac("sha256", segredo).update(p.email.toLowerCase()).digest("hex");
  const { data, error } = await sb.rpc("registrar_pedido_demonstracao", {
    p_nome: p.nome,
    p_cargo: p.cargo,
    p_orgao: p.orgao,
    p_email: p.email,
    p_email_hash: hash,
    p_telefone: p.telefone,
    p_mensagem: p.mensagem,
  });
  if (error) return { erro: FALHA };
  if (data === false) return { erro: "Já recebemos seus pedidos. Aguarde nosso contato." };
  return { aviso: "Pedido recebido. Respondemos em breve." };
}
