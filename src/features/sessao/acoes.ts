"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { clienteServico, clienteSessao } from "@/lib/supabase/servidor";
import { COOKIE_ATIVIDADE, COOKIE_SECRETARIA } from "./cookies";
import { membroEquipe, origemDaRequisicao } from "./dal";

export async function sair() {
  const supabase = await clienteSessao();
  if (supabase) {
    const { ip, aparelho } = await origemDaRequisicao();
    const equipe = await membroEquipe();
    if (equipe) {
      await clienteServico()?.rpc("registrar_auditoria_sistema", {
        p_prefeitura: null,
        p_usuario: equipe.id,
        p_acao: "sessao.saida",
        p_ip: ip,
        p_aparelho: aparelho,
      });
    } else {
      await supabase.rpc("registrar_auditoria", { p_acao: "sessao.saida", p_ip: ip, p_aparelho: aparelho });
    }
    await supabase.auth.signOut({ scope: "local" });
  }
  const loja = await cookies();
  loja.delete(COOKIE_SECRETARIA);
  loja.delete(COOKIE_ATIVIDADE);
  redirect("/entrar");
}
