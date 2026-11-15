"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { clienteServico } from "@/lib/supabase/servidor";
import { exigirEquipe, origemDaRequisicao } from "@/features/sessao/dal";
import { emDemo } from "@/features/demo/dados";
import { configuracoes, importarPrefeitura } from "@/features/tce/rotina";

// "Importar agora" feito pela equipe, para uma prefeitura. A rotina é a mesma da
// noite; o resultado volta como código fixo na URL (nada de erro cru ou conteúdo).
export async function importarPelaEquipe(formData: FormData): Promise<void> {
  const membro = await exigirEquipe();
  const id = z.guid().safeParse(formData.get("id"));
  const de = String(formData.get("volta") ?? "");
  const destino = de === "integracoes" ? "/equipe/integracoes" : de === "detalhe" && id.success ? `/equipe/${id.data}` : "/equipe/prefeituras";
  const volta = (r: string) => redirect(`${destino}?${new URLSearchParams({ ...(id.success && de !== "detalhe" && { sel: id.data }), ...(de === "detalhe" && { aba: "tce" }), importou: r })}`);
  if (!id.success) return volta("erro");
  if (emDemo()) return volta("demo");
  const servico = clienteServico();
  if (!servico) return volta("erro");
  const [cfg] = await configuracoes(servico, id.data);
  if (!cfg) return volta("sem_configuracao");
  const r = await importarPrefeitura(servico, cfg, "manual");
  const { ip, aparelho } = await origemDaRequisicao();
  await servico.rpc("registrar_auditoria_sistema", {
    p_prefeitura: id.data, p_usuario: membro.id, p_acao: "equipe.importar_agora", p_ip: ip ?? undefined, p_aparelho: aparelho ?? undefined,
  });
  revalidatePath("/equipe", "layout");
  return volta(r.erro ? "erro" : "ok");
}
