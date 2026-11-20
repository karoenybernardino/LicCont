import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { clienteServico, clienteSessao } from "@/lib/supabase/servidor";
import { emDemo } from "@/features/demo/dados";
import { perfilDemo } from "@/features/demo/sessao";
import {
  CAIXAS_A_ETIQUETAR_DEMO, DOCUMENTOS_PARCEIRA_DEMO, PARCEIRA_DEMO, PESSOAS_PARCEIRA_DEMO, PESSOA_DEMO_DONO, PESSOA_DEMO_FUNC,
  PREFS_PARCEIRA_DEMO, linhasDemo, type PessoaParceira,
} from "@/features/demo/parceira";
import { montarCapacidade, type CapacidadeBruta } from "@/features/estrutura/capacidade";
import type { Linha, Resumo } from "./indicadores";

// Camada de dados da empresa parceira. Toda leitura passa por funções do banco que conferem
// app.prefeituras_permitidas(); aqui a tela só escolhe entre o que o banco já devolveu.
// Nunca registrar nome, e-mail ou conteúdo de documento em log ou erro.

export type Eu = { pessoaId: string; nome: string; papel: "dono" | "funcionario"; parceiraId: string; parceiraNome: string; trocaSenha: boolean };

export const euParceira = cache(async (): Promise<Eu | null> => {
  if (emDemo()) {
    const perfil = await perfilDemo();
    if (perfil !== "parceira_dono" && perfil !== "parceira_func") return null;
    const p = perfil === "parceira_dono" ? PESSOA_DEMO_DONO : PESSOA_DEMO_FUNC;
    return { pessoaId: p.id, nome: p.nome, papel: p.papel, parceiraId: PARCEIRA_DEMO.id, parceiraNome: PARCEIRA_DEMO.nome, trocaSenha: false };
  }
  const sb = await clienteSessao();
  if (!sb) return null;
  const { data } = await sb.rpc("parceira_eu");
  const l = (data as { pessoa_id: string; nome: string; papel: "dono" | "funcionario"; parceira_id: string; parceira_nome: string; troca_senha: boolean }[] | null)?.[0];
  return l ? { pessoaId: l.pessoa_id, nome: l.nome, papel: l.papel, parceiraId: l.parceira_id, parceiraNome: l.parceira_nome, trocaSenha: l.troca_senha } : null;
});

// Porteiro das telas da empresa: sem sessão de pessoa da empresa, volta para a entrada.
export async function exigirParceira(): Promise<Eu> {
  const eu = await euParceira();
  if (!eu) redirect("/parceira/entrar");
  if (eu.trocaSenha) redirect("/parceira/nova-senha");
  return eu;
}
export async function exigirDono(): Promise<Eu> {
  const eu = await exigirParceira();
  if (eu.papel !== "dono") redirect("/parceira");
  return eu;
}

export const prefeiturasDaEmpresa = cache(async (): Promise<Resumo[]> => {
  if (emDemo()) {
    const eu = await euParceira();
    if (eu?.papel === "dono") return PREFS_PARCEIRA_DEMO;
    const ids = new Set(PESSOA_DEMO_FUNC.prefeituras.map((p) => p.id));
    return PREFS_PARCEIRA_DEMO.filter((p) => ids.has(p.id));
  }
  const sb = await clienteSessao();
  if (!sb) return [];
  const { data } = await sb.rpc("parceira_prefeituras");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map((p) => ({
    id: p.id,
    nome: p.nome,
    caixas: Number(p.caixas),
    caixasPrefeitura: Number(p.caixas_prefeitura),
    caixasCamara: Number(p.caixas_camara),
    documentos: Number(p.documentos),
    aEtiquetar: Number(p.a_etiquetar),
    funcionarios: Number(p.funcionarios),
    modulos: Number(p.modulos),
    caixasPorModulo: Number(p.caixas_por_modulo),
    ultimaAtividade: p.ultima_atividade,
  }));
});

// Seletor do topo: o id precisa estar entre as permitidas; sem escolha válida, vale a primeira (ou "todas" quando a tela aceita).
export function escolherPrefeitura(valor: string | undefined, permitidas: Resumo[], aceitaTodas: boolean): string {
  if (aceitaTodas && valor === "todas") return "todas";
  const achada = permitidas.find((p) => p.id === valor);
  return achada ? achada.id : aceitaTodas ? "todas" : (permitidas[0]?.id ?? "");
}

export async function atividade(prefeitura: string | null, dias = 120): Promise<Linha[]> {
  if (emDemo()) {
    const proprias = (await prefeiturasDaEmpresa()).map((p) => p.id);
    return linhasDemo(prefeitura ? proprias.filter((p) => p === prefeitura) : proprias);
  }
  const sb = await clienteSessao();
  if (!sb) return [];
  const desde = new Date(Date.now() - dias * 86_400_000).toISOString().slice(0, 10);
  const { data } = await sb.rpc("parceira_atividade", { p_prefeitura: prefeitura, p_desde: desde });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map((l) => ({ dia: l.dia, usuarioId: l.usuario_id, pessoa: l.pessoa, orgao: l.orgao, caixas: Number(l.caixas), documentos: Number(l.documentos), etiquetas: Number(l.etiquetas) }));
}

export async function pesquisarDocumentos(prefeitura: string, q: string) {
  const termo = q.trim().slice(0, 80);
  if (emDemo()) {
    const t = termo.toLowerCase();
    return DOCUMENTOS_PARCEIRA_DEMO.filter((d) => d.prefeituraId === prefeitura && (!t || `${d.numero} ${d.objeto}`.toLowerCase().includes(t))).map((d) => ({ id: d.id, tipo: d.tipo, numero: d.numero, ano: d.ano, objeto: d.objeto, caixa: d.caixa }));
  }
  const sb = await clienteSessao();
  if (!sb) return [];
  const { data } = await sb.rpc("parceira_pesquisar", { p_prefeitura: prefeitura, p_q: termo });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map((d) => ({ id: d.id as string, tipo: d.tipo as string, numero: d.numero as string, ano: d.ano as number, objeto: d.objeto as string, caixa: d.caixa_sequencial ? `CX - ${String(d.caixa_sequencial).padStart(4, "0")}` : "—" }));
}

export async function caixasAEtiquetar(prefeitura: string | null, permitidas: Resumo[]) {
  const alvos = prefeitura ? permitidas.filter((p) => p.id === prefeitura) : permitidas;
  if (emDemo()) {
    const ids = new Set(alvos.map((p) => p.id));
    return CAIXAS_A_ETIQUETAR_DEMO.filter((c) => ids.has(c.prefeituraId));
  }
  const sb = await clienteSessao();
  if (!sb) return [];
  const listas = await Promise.all(alvos.map((p) => sb.rpc("parceira_a_etiquetar", { p_prefeitura: p.id })));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return listas.flatMap((r) => ((r.data ?? []) as any[]).map((c) => ({ id: c.id as string, rotulo: `CX - ${String(c.sequencial ?? 0).padStart(4, "0")}`, descricao: `${c.orgao === "camara" ? "Câmara" : "Prefeitura"} · ${c.tipo === "geral" ? "geral" : "detalhada"}`, prefeituraId: "", prefeitura: String(c.prefeitura_nome) })));
}

export async function capacidadeDaPrefeitura(prefeitura: string, permitidas: Resumo[]) {
  const p = permitidas.find((x) => x.id === prefeitura);
  if (!p) return null;
  if (emDemo()) {
    // Distribui as caixas ocupadas pelos módulos, só para a demonstração.
    const por = Array.from({ length: p.modulos }, (_, i) => ({ rua: String.fromCharCode(65 + Math.floor(i / 8)), modulo: (i % 8) + 1, ocupadas: Math.min(p.caixasPorModulo, Math.max(0, p.caixas - i * p.caixasPorModulo)) }));
    return montarCapacidade({ caixas_por_modulo: p.caixasPorModulo, por_modulo: por, por_nivel: [] });
  }
  const sb = await clienteSessao();
  if (!sb) return null;
  const { data } = await sb.rpc("parceira_capacidade", { p_prefeitura: prefeitura });
  return data ? montarCapacidade(data as CapacidadeBruta) : null;
}

// Pessoas da empresa (dono: todas; funcionário: só ele). E-mail só com o servidor (Auth).
export async function pessoasDaEmpresa(parceiraId?: string): Promise<PessoaParceira[]> {
  if (emDemo()) {
    const eu = await euParceira();
    return eu?.papel === "funcionario" ? [PESSOA_DEMO_FUNC] : PESSOAS_PARCEIRA_DEMO;
  }
  const sb = await clienteSessao();
  const servico = clienteServico();
  if (!sb) return [];
  const { data } = await sb.rpc("parceira_equipe", { p_parceira: parceiraId ?? null });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const linhas = (data ?? []) as any[];
  const contas = servico ? await Promise.all(linhas.map((p) => servico.auth.admin.getUserById(p.usuario_id))) : [];
  return linhas.map((p, i) => ({
    id: p.pessoa_id,
    nome: p.nome,
    email: contas[i]?.data.user?.email ?? null,
    papel: p.papel,
    ativa: p.ativa,
    trocaSenha: p.troca_senha,
    prefeituras: ((p.prefeituras ?? []) as { id: string; nome: string; alocado_por: string }[]).map((x) => ({ id: x.id, nome: x.nome, alocadoPor: x.alocado_por })),
  }));
}
