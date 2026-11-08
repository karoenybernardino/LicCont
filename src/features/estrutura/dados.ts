import "server-only";
import { cache } from "react";
import { clienteSessao } from "@/lib/supabase/servidor";
import type { Usuario } from "@/features/sessao/dal";
import { emDemo } from "@/features/demo/dados";
import { perfilDemo } from "@/features/demo/sessao";
import { ESTRUTURA_DEMO, alteracoesDemo } from "@/features/demo/estrutura";
import type { Estrutura } from "./ocupacao";
import { NOMES, agrupar, type Alteracao, type LinhaAuditoria } from "./alteracoes";

// Leitura pela sessão do usuário: o RLS devolve só a própria prefeitura.

const PAGINA = 1000; // limite de linhas por resposta da Data API

// Busca todas as páginas de uma consulta (galpão grande passa de 1000 níveis).
async function todas<T>(buscar: (de: number, ate: number) => PromiseLike<{ data: T[] | null }>) {
  const linhas: T[] = [];
  for (let de = 0; ; de += PAGINA) {
    const { data } = await buscar(de, de + PAGINA - 1);
    linhas.push(...(data ?? []));
    if (!data || data.length < PAGINA) return linhas;
  }
}

const VAZIA: Estrutura = { galpoes: [], galpao: null, ruas: [], modulos: [], niveis: [] };

export const carregarEstrutura = cache(async (galpaoId?: string): Promise<Estrutura> => {
  if (emDemo()) return ESTRUTURA_DEMO;
  const sb = await clienteSessao();
  if (!sb) return VAZIA;

  const { data: galpoes } = await sb.from("galpoes").select("id, nome, ativo").order("nome");
  const lista = galpoes ?? [];
  const galpao = lista.find((g) => g.id === galpaoId) ?? lista.find((g) => g.ativo) ?? lista[0] ?? null;
  if (!galpao) return { ...VAZIA, galpoes: lista };

  const [{ data: ruas }, niveis] = await Promise.all([
    sb.from("ruas").select("id, galpao_id, codigo, ativo").eq("galpao_id", galpao.id).order("codigo"),
    todas((de, ate) =>
      sb
        .from("estrutura_ocupacao")
        .select("nivel_id, modulo_id, numero, capacidade, caixas, ativo")
        .eq("galpao_id", galpao.id)
        .order("nivel_id")
        .range(de, ate),
    ),
  ]);
  const ids = (ruas ?? []).map((r) => r.id);
  const modulos = ids.length
    ? await todas((de, ate) =>
        sb.from("modulos").select("id, rua_id, numero, ativo").in("rua_id", ids).order("numero").order("id").range(de, ate),
      )
    : [];

  return {
    galpoes: lista,
    galpao,
    ruas: (ruas ?? []).map((r) => ({ id: r.id, galpaoId: r.galpao_id, codigo: r.codigo, ativo: r.ativo })),
    modulos: modulos.map((m) => ({ id: m.id, ruaId: m.rua_id, numero: m.numero, ativo: m.ativo })),
    niveis: niveis
      .map((n) => ({ id: n.nivel_id, moduloId: n.modulo_id, numero: n.numero, capacidade: n.capacidade, caixas: n.caixas, ativo: n.ativo }))
      .sort((a, b) => a.numero - b.numero),
  };
});

// Caixas ativas de um nível (para desativar uma delas).
export async function caixasDoNivel(nivelId: string): Promise<number[]> {
  if (emDemo()) {
    const nivel = ESTRUTURA_DEMO.niveis.find((n) => n.id === nivelId);
    return nivel ? Array.from({ length: nivel.caixas }, (_, i) => i + 1) : [];
  }
  const sb = await clienteSessao();
  if (!sb) return [];
  const { data } = await sb.from("caixas").select("numero").eq("nivel_id", nivelId).eq("ativo", true).order("numero");
  return (data ?? []).map((c) => c.numero);
}

// Coordenador: algum vínculo com papel coordenador (pode mexer em caixas).
export const ehCoordenador = cache(async (u: Usuario) => {
  if (emDemo()) return (await perfilDemo()) === "coordenador";
  const sb = await clienteSessao();
  if (!sb) return false;
  const { data } = await sb.from("vinculos").select("id").eq("usuario_id", u.id).eq("papel", "coordenador").limit(1);
  return !!data?.length;
});

export async function podeCaixas(u: Usuario) {
  return u.administrador || (await ehCoordenador(u));
}

// Últimas alterações da estrutura, da auditoria (só o administrador lê).
// Inclusões da mesma operação viram uma linha ("3 caixas adicionadas").
export async function ultimasAlteracoes(e: Estrutura): Promise<Alteracao[]> {
  if (emDemo()) return alteracoesDemo();
  const sb = await clienteSessao();
  if (!sb) return [];
  const { data } = await sb
    .from("auditoria")
    .select("acao, alvo_tabela, criado_em, antes, depois")
    .in("alvo_tabela", Object.keys(NOMES))
    .order("criado_em", { ascending: false })
    .order("id", { ascending: false })
    .limit(300);
  return agrupar((data ?? []) as LinhaAuditoria[], e).slice(0, 6);
}

// Galpão de uma rua (para abrir a tela da rua).
export async function galpaoDaRua(ruaId: string): Promise<string | null> {
  if (emDemo()) return ESTRUTURA_DEMO.ruas.find((r) => r.id === ruaId)?.galpaoId ?? null;
  const sb = await clienteSessao();
  if (!sb) return null;
  const { data } = await sb.from("ruas").select("galpao_id").eq("id", ruaId).maybeSingle();
  return data?.galpao_id ?? null;
}
