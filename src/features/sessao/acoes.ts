"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { clienteServico, clienteSessao } from "@/lib/supabase/servidor";
import { COOKIE_ATIVIDADE, COOKIE_SECRETARIA, opcoesCookie } from "./cookies";
import { COOKIE_PARCEIRA_PREF } from "@/features/parceira/escolha";
import { COOKIE_PERFIL_DEMO, emDemo } from "@/features/demo/dados";
import { euParceira } from "@/features/parceira/dados";
import { exigirSessao, membroEquipe, origemDaRequisicao, secretariaAtual, secretariaPermitida } from "./dal";

export async function sair() {
  if (emDemo()) {
    const loja = await cookies();
    const equipe = loja.get(COOKIE_PERFIL_DEMO)?.value === "equipe";
    const perfil = loja.get(COOKIE_PERFIL_DEMO)?.value ?? "";
    loja.delete(COOKIE_PERFIL_DEMO);
    loja.delete(COOKIE_SECRETARIA);
    loja.delete(COOKIE_PARCEIRA_PREF);
    redirect(equipe ? "/equipe/entrar" : perfil.startsWith("parceira_") ? "/parceira/entrar" : "/entrar");
  }
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
      if (await euParceira()) destino = "/parceira/entrar";
      await supabase.rpc("registrar_auditoria", { p_acao: "sessao.saida", p_ip: ip, p_aparelho: aparelho });
    }
    await supabase.auth.signOut({ scope: "local" });
  }
  const loja = await cookies();
  loja.delete(COOKIE_SECRETARIA);
  loja.delete(COOKIE_ATIVIDADE);
  loja.delete(COOKIE_PARCEIRA_PREF);
  redirect(destino);
}

// Troca a secretaria em uso (filtro da tela), só entre as permitidas. Auditada.
export async function trocarSecretaria(formData: FormData) {
  const { usuario } = await exigirSessao();
  const valor = formData.get("secretaria");
  const secretaria = await secretariaPermitida(usuario, typeof valor === "string" ? valor : undefined);
  if (!secretaria) redirect("/inicio");

  const loja = await cookies();
  // O anterior vem da conferência no servidor, não do cookie cru.
  const anterior = (await secretariaAtual(usuario))?.id ?? "todas";
  const nova = secretaria.id ?? "todas";
  if (emDemo()) {
    loja.set(COOKIE_SECRETARIA, nova, opcoesCookie);
  } else if (nova !== anterior) {
    const supabase = (await clienteSessao())!;
    const { ip, aparelho } = await origemDaRequisicao();
    const { error } = await supabase.rpc("registrar_auditoria", {
      p_acao: "sessao.troca_secretaria",
      p_alvo_tabela: "secretarias",
      p_alvo_id: secretaria.id,
      p_antes: { secretaria: anterior },
      p_depois: { secretaria: nova },
      p_ip: ip,
      p_aparelho: aparelho,
    });
    // Sem registro na auditoria, não troca.
    if (!error) loja.set(COOKIE_SECRETARIA, nova, opcoesCookie);
  }
  redirect("/inicio");
}
