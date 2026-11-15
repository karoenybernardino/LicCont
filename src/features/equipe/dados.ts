import "server-only";
import { clienteSessao } from "@/lib/supabase/servidor";
import { emDemo } from "@/features/demo/dados";
import { ACOES_DEMO, INTEGRACOES_DEMO, PEDIDOS_DEMO } from "@/features/demo/equipe";
import type { SituacaoPedido } from "./textos";

// Leituras da área da equipe. Só números, datas e situações: nada do acervo.

export type Integracao = {
  prefeituraId: string;
  ativo: boolean;
  situacao: "rodando" | "ok" | "erro" | null;
  ultimaEm: string | null;
  novos: number;
  erros7d: number;
};

export async function integracoes(): Promise<Map<string, Integracao>> {
  const mapa = new Map<string, Integracao>();
  if (emDemo()) {
    for (const i of INTEGRACOES_DEMO) mapa.set(i.prefeituraId, i);
    return mapa;
  }
  const supabase = await clienteSessao();
  if (!supabase) return mapa;
  const { data } = await supabase.rpc("equipe_integracoes");
  for (const r of data ?? []) {
    mapa.set(r.prefeitura_id, {
      prefeituraId: r.prefeitura_id,
      ativo: r.tce_ativo,
      situacao: r.situacao as Integracao["situacao"],
      ultimaEm: r.ultima_em,
      novos: r.novos ?? 0,
      erros7d: r.erros_7d,
    });
  }
  return mapa;
}

export type Pedido = {
  id: string;
  nome: string;
  cargo: string | null;
  orgao: string;
  email: string;
  telefone: string | null;
  mensagem: string | null;
  situacao: SituacaoPedido;
  demoEm: string | null;
  responsavel: string | null;
  criadoEm: string;
};

// Pedidos do site, do mais novo ao mais antigo. A leitura é pela sessão da
// equipe (RLS: app.eh_equipe()).
export async function listarPedidos(limite = 100): Promise<Pedido[]> {
  if (emDemo()) return PEDIDOS_DEMO.map((p) => ({ ...p })) as Pedido[];
  const supabase = await clienteSessao();
  if (!supabase) return [];
  const { data } = await supabase
    .from("pedidos_demonstracao")
    .select("id, nome, cargo, orgao, email, telefone, mensagem, situacao, demo_em, responsavel, criado_em")
    .order("criado_em", { ascending: false })
    .limit(limite);
  return (data ?? []).map((p) => ({
    id: p.id, nome: p.nome, cargo: p.cargo, orgao: p.orgao, email: p.email, telefone: p.telefone,
    mensagem: p.mensagem, situacao: p.situacao as SituacaoPedido, demoEm: p.demo_em,
    responsavel: p.responsavel, criadoEm: p.criado_em,
  }));
}

export type AcaoEquipe = {
  id: number;
  criadoEm: string;
  quem: string;
  acao: string;
  statusNovo: string | null;
  prefeitura: string | null;
  ip: string | null;
};

// "Quem": a equipe aparece só como "Equipe LicCONT" mais 4 letras do código da conta.
export async function acoesEquipe(opcoes: { dias?: number | null; prefeitura?: string | null; limite?: number } = {}): Promise<AcaoEquipe[]> {
  if (emDemo()) return ACOES_DEMO.slice(0, opcoes.limite ?? 200);
  const supabase = await clienteSessao();
  if (!supabase) return [];
  const desde = opcoes.dias ? new Date(Date.now() - opcoes.dias * 86_400_000).toISOString() : undefined;
  const { data } = await supabase.rpc("equipe_auditoria", {
    p_desde: desde,
    p_prefeitura: opcoes.prefeitura ?? undefined,
    p_limite: opcoes.limite ?? 200,
  });
  type Linha = { id: number; criado_em: string; usuario_id: string | null; acao: string; status_novo: string | null; prefeitura_nome: string | null; ip: string | null };
  return ((data ?? []) as Linha[]).map((r) => ({
    id: r.id,
    criadoEm: r.criado_em,
    quem: r.usuario_id ? `Equipe · ${r.usuario_id.slice(0, 4)}` : "Sistema",
    acao: r.acao,
    statusNovo: r.status_novo,
    prefeitura: r.prefeitura_nome,
    ip: r.ip,
  }));
}
