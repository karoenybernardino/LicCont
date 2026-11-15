"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { clienteServico, clienteSessao } from "@/lib/supabase/servidor";
import { MENSAGEM_INDISPONIVEL } from "@/features/login/esquemas";
import type { EstadoAcao } from "@/ui/formulario";
import { exigirEquipe, origemDaRequisicao } from "@/features/sessao/dal";
import { AVISO_DEMO, emDemo } from "@/features/demo/dados";
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

const esquemaPedido = z.object({
  id: z.guid(),
  situacao: z.enum(["novo", "contato", "agendado", "feito", "descartado"]),
  demo_em: z.string().trim().transform((v) => v || null).pipe(z.iso.date("Data inválida.").nullable()),
  responsavel: z.string().trim().max(80, "Nome do responsável muito longo."),
});

// Andamento do pedido de demonstração: só a equipe; o banco confere de novo (RPC com 2º fator).
export async function atualizarPedido(_: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  await exigirEquipe();
  if (emDemo()) return { aviso: AVISO_DEMO };
  const supabase = await clienteSessao();
  if (!supabase) return { erro: MENSAGEM_INDISPONIVEL };
  const d = esquemaPedido.safeParse(Object.fromEntries(formData));
  if (!d.success) return { erro: d.error.issues[0].message };
  const { data, error } = await supabase.rpc("equipe_atualizar_pedido", {
    p_id: d.data.id, p_situacao: d.data.situacao, p_demo_em: d.data.demo_em ?? undefined, p_responsavel: d.data.responsavel,
  });
  if (error || !data) return { erro: "Não foi possível salvar. Tente de novo." };
  revalidatePath("/equipe", "layout");
  return { aviso: "Pedido atualizado." };
}
