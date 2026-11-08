"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { clienteServico, clienteSessao } from "@/lib/supabase/servidor";
import { COOKIE_ATIVIDADE, COOKIE_SECRETARIA, opcoesCookie } from "./cookies";
import { exigirSessao, membroEquipe, origemDaRequisicao, secretariaPermitida } from "./dal";

export async function sair() {
  const supabase = await clienteSessao();
  let destino = "/entrar";
  if (supabase) {
    const { ip, aparelho } = await origemDaRequisicao();
    const equipe = await membroEquipe();
    if (equipe) {
      destino = "/equipe/entrar";
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
  redirect(destino);
}

// Troca a secretaria em uso (filtro da tela), só entre as permitidas. Auditada.
export async function trocarSecretaria(formData: FormData) {
  const { usuario } = await exigirSessao();
  const valor = formData.get("secretaria");
  const secretaria = await secretariaPermitida(usuario, typeof valor === "string" ? valor : undefined);
  if (!secretaria) redirect("/inicio");

  const loja = await cookies();
  const anterior = loja.get(COOKIE_SECRETARIA)?.value ?? null;
  const nova = secretaria.id ?? "todas";
  if (nova !== anterior) {
    const supabase = (await clienteSessao())!;
    const { ip, aparelho } = await origemDaRequisicao();
    await supabase.rpc("registrar_auditoria", {
      p_acao: "sessao.troca_secretaria",
      p_alvo_tabela: "secretarias",
      p_alvo_id: secretaria.id,
      p_antes: { secretaria: anterior },
      p_depois: { secretaria: nova },
      p_ip: ip,
      p_aparelho: aparelho,
    });
    loja.set(COOKIE_SECRETARIA, nova, opcoesCookie);
  }
  redirect("/inicio");
}
