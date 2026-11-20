import "server-only";
import { clienteServico, clienteSessao } from "@/lib/supabase/servidor";
import { PREFEITURAS_DEMO, USUARIOS_DEMO, emDemo } from "@/features/demo/dados";
import type { PrefeituraLista } from "./lista";

export type { PrefeituraLista } from "./lista";
export type Administrador = { id: string; nome: string; email: string; ativo: boolean };

const DATA_DEMO = "2026-11-08T12:00:00Z";
const adminsDemo = (): Administrador[] =>
  USUARIOS_DEMO.filter((u) => u.perfil === "administrador").map(({ id, nome, email, ativo }) => ({ id, nome, email, ativo }));

// Leitura pela sessão da equipe (RLS: app.eh_equipe()). A contagem de
// administradores vem do servidor (service_role), só números por prefeitura.
export async function listarPrefeituras(): Promise<PrefeituraLista[]> {
  if (emDemo()) return PREFEITURAS_DEMO.map((p, i) => ({ ...p, criadoEm: DATA_DEMO, administradores: i === 0 ? adminsDemo().length : 0, plano: "completo", contratoInicio: "2026-11-08", implantacaoCentavos: 0, mensalidadeCentavos: 0, tceCodigo: "000" }));
  const supabase = await clienteSessao();
  if (!supabase) return [];
  const { data } = await supabase.from("prefeituras").select("id, nome, cnpj, status, criado_em, plano, contrato_inicio, valor_implantacao_centavos, valor_mensalidade_centavos, tce_codigo_municipio, caixas_por_modulo").order("nome");
  const servico = clienteServico();
  const { data: admins } = servico
    ? await servico.from("usuarios").select("prefeitura_id").eq("administrador", true).eq("ativo", true)
    : { data: [] as { prefeitura_id: string }[] };
  const total = new Map<string, number>();
  for (const a of admins ?? []) total.set(a.prefeitura_id, (total.get(a.prefeitura_id) ?? 0) + 1);
  return (data ?? []).map((p) => ({
    id: p.id, nome: p.nome, cnpj: p.cnpj, status: p.status, criadoEm: p.criado_em, administradores: total.get(p.id) ?? 0,
    plano: p.plano, contratoInicio: p.contrato_inicio, implantacaoCentavos: p.valor_implantacao_centavos, mensalidadeCentavos: p.valor_mensalidade_centavos, tceCodigo: p.tce_codigo_municipio, caixasPorModulo: p.caixas_por_modulo,
  })) as PrefeituraLista[];
}

export async function obterPrefeitura(id: string) {
  return (await listarPrefeituras()).find((p) => p.id === id) ?? null;
}

// Administradores de uma prefeitura (nome e e-mail só para a equipe, na tela).
export async function listarAdministradores(prefeituraId: string): Promise<Administrador[]> {
  if (emDemo()) return prefeituraId === PREFEITURAS_DEMO[0].id ? adminsDemo() : [];
  const servico = clienteServico();
  if (!servico) return [];
  const { data } = await servico
    .from("usuarios")
    .select("id, nome, ativo")
    .eq("prefeitura_id", prefeituraId)
    .eq("administrador", true)
    .order("nome");
  const contas = await Promise.all((data ?? []).map((u) => servico.auth.admin.getUserById(u.id)));
  return (data ?? []).map((u, i) => ({ id: u.id, nome: u.nome, email: contas[i].data.user?.email ?? "", ativo: u.ativo }));
}

// Só números por prefeitura (função do banco que exige a equipe com 2º fator).
export type UsoPrefeitura = {
  prefeituraId: string;
  secretarias: number;
  usuarios: number;
  documentos: number;
  caixas: number;
  bytesPdf: number;
  ultimoAcesso: string | null;
  loginsMes: number;
  limiteBytes: number;
};

export async function usoPrefeituras(): Promise<Map<string, UsoPrefeitura>> {
  const mapa = new Map<string, UsoPrefeitura>();
  if (emDemo()) {
    for (const p of PREFEITURAS_DEMO) {
      mapa.set(p.id, { prefeituraId: p.id, secretarias: 4, usuarios: 6, documentos: 1240, caixas: 86, bytesPdf: 3_400_000_000, ultimoAcesso: DATA_DEMO, loginsMes: 57, limiteBytes: 10 * 1024 ** 3 });
    }
    return mapa;
  }
  const supabase = await clienteSessao();
  if (!supabase) return mapa;
  const { data } = await supabase.rpc("equipe_uso_prefeituras");
  for (const r of data ?? []) {
    mapa.set(r.prefeitura_id, {
      prefeituraId: r.prefeitura_id,
      secretarias: r.secretarias,
      usuarios: r.usuarios,
      documentos: r.documentos,
      caixas: r.caixas,
      bytesPdf: Number(r.bytes_pdf),
      ultimoAcesso: r.ultimo_acesso,
      loginsMes: r.logins_mes,
      limiteBytes: Number(r.limite_bytes),
    });
  }
  return mapa;
}

// Até quando há autorização de suporte valendo (ou null). Só a equipe executa.
export async function suporteAutorizadoAte(prefeituraId: string): Promise<string | null> {
  if (emDemo()) return null;
  const supabase = await clienteSessao();
  if (!supabase) return null;
  const { data } = await supabase.rpc("suporte_autorizado", { p_prefeitura: prefeituraId });
  return (data as string | null) ?? null;
}

// Tentativas de login recusadas no mês, em todas as prefeituras (um número).
export async function recusadosNoMes(): Promise<number> {
  if (emDemo()) return 12;
  const supabase = await clienteSessao();
  if (!supabase) return 0;
  const { data } = await supabase.rpc("equipe_recusados_mes");
  return Number(data ?? 0);
}
