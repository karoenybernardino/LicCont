"use server";

import { createHmac } from "node:crypto";
import { clienteServico } from "@/lib/supabase/servidor";
import { AVISO_DEMO, emDemo } from "@/features/demo/dados";
import { origemDaRequisicao } from "@/features/sessao/dal";
import type { EstadoAcao } from "@/ui/formulario";
import { lerPedido } from "./pedido";

// Nenhum dado do formulário vai para log ou mensagem de erro.
const FALHA = "Não foi possível enviar agora. Tente de novo em alguns minutos.";
// Resposta única: pedido repetido, limite por IP e isca parecem sucesso.
const RECEBIDO: EstadoAcao = { aviso: "Pedido recebido. Respondemos em breve." };

const hmac = (segredo: string, valor: string) => createHmac("sha256", segredo).update(valor).digest("hex");

export async function pedirDemonstracao(_: EstadoAcao, dados: FormData): Promise<EstadoAcao> {
  if (emDemo()) return { aviso: AVISO_DEMO };
  const r = lerPedido(dados);
  if (!r.success) {
    // Isca preenchida: finge que deu certo.
    if (String(dados.get("empresa_site") ?? "") !== "") return RECEBIDO;
    return { erro: r.error.issues[0]?.message ?? "Confira os dados e tente de novo." };
  }
  const p = r.data;
  const sb = clienteServico();
  // Segredo próprio (não a service_role). Sem ele, falha genérica.
  const segredo = process.env.PEDIDO_HMAC_SECRET;
  if (!sb || !segredo) return { erro: FALHA };
  const { ip } = await origemDaRequisicao();
  const { data, error } = await sb.rpc("registrar_pedido_demonstracao", {
    p_nome: p.nome,
    p_cargo: p.cargo,
    p_orgao: p.orgao,
    p_email: p.email,
    p_email_hash: hmac(segredo, p.email.toLowerCase()),
    p_ip_hash: ip ? hmac(segredo, `ip:${ip}`) : null,
    p_telefone: p.telefone,
    p_mensagem: p.mensagem,
  });
  if (error || data === "teto") return { erro: FALHA };
  return RECEBIDO;
}
