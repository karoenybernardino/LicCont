import "server-only";
import { clienteSessao } from "@/lib/supabase/servidor";
import { emDemo } from "@/features/demo/dados";
import { tituloDocumento } from "@/features/documentos/titulo";

export type ConfigTce = { ativo: boolean; codigo: string; secretariaId: string | null; anos: number[]; tipos: string[] };
export type ImportacaoTce = {
  id: string;
  iniciada_em: string;
  origem: "agendada" | "manual";
  situacao: "rodando" | "ok" | "erro";
  anos: number[];
  novos: number;
  duplicados: number;
  ja_existentes: number;
  erro_codigo: string | null;
};
export type ItemFila = {
  id: string;
  titulo: string;
  tipo: "licitacao" | "contrato";
  objeto: string;
  valor: number | null;
  secretariaId: string;
  duplicado: { id: string; documento: string } | null;
};

const CONFIG_DEMO: ConfigTce = { ativo: true, codigo: "162", secretariaId: null, anos: [2025, 2026], tipos: ["licitacao", "contrato"] };

export async function lerConfig(prefeituraId: string): Promise<ConfigTce> {
  if (emDemo()) return CONFIG_DEMO;
  const sb = await clienteSessao();
  const { data } = sb
    ? await sb.from("prefeituras").select("tce_ativo, tce_codigo_municipio, tce_secretaria_id, tce_anos, tce_tipos").eq("id", prefeituraId).maybeSingle()
    : { data: null };
  return {
    ativo: data?.tce_ativo ?? false,
    codigo: data?.tce_codigo_municipio ?? "",
    secretariaId: data?.tce_secretaria_id ?? null,
    anos: data?.tce_anos ?? [],
    tipos: data?.tce_tipos ?? ["licitacao", "contrato"],
  };
}

export async function historico(): Promise<ImportacaoTce[]> {
  if (emDemo()) {
    return [
      { id: "de910000-0000-0000-0000-000000000001", iniciada_em: "2026-11-15T05:03:00Z", origem: "agendada", situacao: "ok", anos: [2026], novos: 31, duplicados: 2, ja_existentes: 181, erro_codigo: null },
      { id: "de910000-0000-0000-0000-000000000002", iniciada_em: "2026-11-13T05:04:00Z", origem: "agendada", situacao: "erro", anos: [2026], novos: 0, duplicados: 0, ja_existentes: 0, erro_codigo: "indisponivel" },
    ];
  }
  const sb = await clienteSessao();
  if (!sb) return [];
  const { data } = await sb
    .from("importacoes_tce")
    .select("id, iniciada_em, origem, situacao, anos, novos, duplicados, ja_existentes, erro_codigo")
    .order("iniciada_em", { ascending: false })
    .limit(30);
  return (data ?? []) as ImportacaoTce[];
}

// Documentos do TCE por conferir, mais os duplicados que esperam decisão.
export async function fila(): Promise<{ itens: ItemFila[]; duplicados: ItemFila[] }> {
  if (emDemo()) {
    return {
      itens: [{ id: "de920000-0000-0000-0000-000000000001", titulo: "Pregão Eletrônico 021/2026", tipo: "licitacao", objeto: "Aquisição de gêneros para a merenda escolar", valor: 128400, secretariaId: "", duplicado: null }],
      duplicados: [],
    };
  }
  const sb = await clienteSessao();
  if (!sb) return { itens: [], duplicados: [] };
  const [docs, dups] = await Promise.all([
    sb
      .from("documentos")
      .select("id, tipo, modalidade, numero, ano, objeto, valor, secretaria_id")
      .eq("tce_a_conferir", true)
      .eq("ativo", true)
      .order("criado_em", { ascending: false })
      .limit(200),
    sb.from("tce_duplicados").select("id, tipo, numero, ano, documento_id, empresa").is("decisao", null).order("criado_em", { ascending: false }).limit(100),
  ]);
  return {
    itens: (docs.data ?? []).map((d) => ({
      id: d.id,
      titulo: tituloDocumento({ tipo: d.tipo, modalidade: d.modalidade, numero: d.numero, ano: d.ano }),
      tipo: d.tipo,
      objeto: d.objeto,
      valor: d.valor,
      secretariaId: d.secretaria_id,
      duplicado: null,
    })),
    duplicados: (dups.data ?? []).map((t) => ({
      id: t.id,
      titulo: `${t.tipo === "contrato" ? "Contrato" : "Licitação"} ${t.numero}/${t.ano}`,
      tipo: t.tipo,
      objeto: t.empresa ?? "",
      valor: null,
      secretariaId: "",
      duplicado: { id: t.id, documento: t.documento_id },
    })),
  };
}

export async function contarFila(): Promise<number> {
  if (emDemo()) return 38;
  const sb = await clienteSessao();
  if (!sb) return 0;
  const { count } = await sb.from("documentos").select("id", { count: "exact", head: true }).eq("tce_a_conferir", true).eq("ativo", true);
  return count ?? 0;
}
