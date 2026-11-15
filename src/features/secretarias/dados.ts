import "server-only";
import { clienteSessao } from "@/lib/supabase/servidor";
import { DETALHES_SECRETARIAS_DEMO, SECRETARIAS_DEMO, emDemo } from "@/features/demo/dados";
import { ESTRUTURA_DEMO } from "@/features/demo/estrutura";

export type SecretariaDetalhe = {
  id: string;
  nome: string;
  ativa: boolean;
  sigla: string | null;
  telefone: string | null;
  email: string | null;
  responsavelId: string | null;
  cargo: string | null;
  recebeLicitacoes: boolean;
  recebeContratos: boolean;
  exigeAprovacao: boolean;
  avisarAtrasos: boolean;
  prazo: number;
  ruaPreferencialId: string | null;
  documentos: number;
};

const COLUNAS =
  "id, nome, ativa, sigla, telefone, email_contato, responsavel_id, cargo_responsavel, recebe_licitacoes, recebe_contratos, exige_aprovacao_emprestimo, avisar_atrasos, prazo_emprestimo_dias, rua_preferencial_id";

// Leitura pela sessão do administrador (RLS: só a própria prefeitura).
export async function listarSecretariasDetalhe(id?: string): Promise<SecretariaDetalhe[]> {
  if (emDemo()) {
    return SECRETARIAS_DEMO.filter((s) => !id || s.id === id).map((s) => {
      const d = DETALHES_SECRETARIAS_DEMO[s.id];
      return {
        id: s.id, nome: s.nome, ativa: s.ativa, sigla: d?.sigla ?? null, telefone: d?.telefone ?? null, email: d?.email ?? null,
        responsavelId: d?.responsavelId ?? null, cargo: d?.cargo ?? null, recebeLicitacoes: true, recebeContratos: true,
        exigeAprovacao: d?.exigeAprovacao ?? false, avisarAtrasos: true, prazo: d?.prazo ?? 15, ruaPreferencialId: null, documentos: 0,
      };
    });
  }
  const sb = await clienteSessao();
  if (!sb) return [];
  let consulta = sb.from("secretarias").select(COLUNAS).order("nome");
  if (id) consulta = consulta.eq("id", id);
  const { data } = await consulta;
  const linhas = data ?? [];
  // Total de documentos ativos por secretaria (só o número).
  const totais = await Promise.all(
    linhas.map((s) => sb.from("documentos").select("id", { count: "exact", head: true }).eq("secretaria_id", s.id).eq("ativo", true)),
  );
  return linhas.map((s, i) => ({
    id: s.id, nome: s.nome, ativa: s.ativa, sigla: s.sigla, telefone: s.telefone, email: s.email_contato,
    responsavelId: s.responsavel_id, cargo: s.cargo_responsavel, recebeLicitacoes: s.recebe_licitacoes,
    recebeContratos: s.recebe_contratos, exigeAprovacao: s.exige_aprovacao_emprestimo, avisarAtrasos: s.avisar_atrasos,
    prazo: s.prazo_emprestimo_dias, ruaPreferencialId: s.rua_preferencial_id, documentos: totais[i].count ?? 0,
  }));
}

// Ruas ativas de todos os galpões, para "Rua preferencial no galpão".
export async function listarRuasParaEscolha(): Promise<{ id: string; rotulo: string }[]> {
  if (emDemo()) return ESTRUTURA_DEMO.ruas.map((r) => ({ id: r.id, rotulo: `Rua ${r.codigo}` }));
  const sb = await clienteSessao();
  if (!sb) return [];
  const [{ data: ruas }, { data: galpoes }] = await Promise.all([
    sb.from("ruas").select("id, codigo, galpao_id").eq("ativo", true).order("codigo"),
    sb.from("galpoes").select("id, nome"),
  ]);
  const nomes = new Map((galpoes ?? []).map((g) => [g.id, g.nome]));
  const varios = (galpoes ?? []).length > 1;
  return (ruas ?? []).map((r) => ({ id: r.id, rotulo: varios ? `Rua ${r.codigo} · ${nomes.get(r.galpao_id) ?? ""}` : `Rua ${r.codigo}` }));
}
