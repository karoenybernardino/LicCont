import "server-only";
import { clienteSessao } from "@/lib/supabase/servidor";
import { emDemo } from "@/features/demo/dados";
import { tituloDocumento } from "@/features/documentos/titulo";
import { chaveProcesso } from "./validar";

export type Lote = {
  id: string;
  codigo: string;
  criado_em: string;
  gravados: number;
  pulados: number;
  situacao: "aberto" | "gravado" | "desfeito";
};

// Código curto do lote para a tela: aaaa-mmdd-nnnn (nnnn = fim do id).
export function codigoLote(id: string, criadoEm: string) {
  const d = new Date(criadoEm);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}-${id.replace(/-/g, "").slice(-4)}`;
}

// Processos já cadastrados (ativos) nos anos da planilha. O PostgREST devolve
// no máximo 1.000 linhas por vez, então lê em páginas.
export async function processosExistentes(anos: number[]): Promise<Set<string>> {
  const saida = new Set<string>();
  if (emDemo() || !anos.length) return saida;
  const sb = await clienteSessao();
  if (!sb) return saida;
  for (let de = 0; ; de += 1000) {
    const { data } = await sb
      .from("documentos")
      .select("tipo, modalidade, numero, ano")
      .eq("ativo", true)
      .in("ano", anos)
      .order("id")
      .range(de, de + 999);
    for (const d of data ?? []) saida.add(chaveProcesso({ tipo: d.tipo, modalidade: d.modalidade, numero: d.numero, ano: d.ano }));
    if ((data?.length ?? 0) < 1000) break;
  }
  return saida;
}

export async function listarLotes(): Promise<Lote[]> {
  if (emDemo()) {
    return [
      { id: "de900000-0000-0000-0000-000000000007", codigo: "2026-1115-0007", criado_em: "2026-11-15T12:00:00Z", gravados: 1198, pulados: 13, situacao: "gravado" },
      { id: "de900000-0000-0000-0000-000000000006", codigo: "2026-1110-0005", criado_em: "2026-11-10T12:00:00Z", gravados: 0, pulados: 0, situacao: "desfeito" },
    ];
  }
  const sb = await clienteSessao();
  if (!sb) return [];
  const { data } = await sb
    .from("lotes_importacao")
    .select("id, criado_em, gravados, pulados, situacao")
    .order("criado_em", { ascending: false })
    .limit(50);
  return (data ?? []).map((l) => ({ ...l, codigo: codigoLote(l.id, l.criado_em) })) as Lote[];
}

export type SemEndereco = { id: string; titulo: string; objeto: string; ano: number; secretaria_id: string; origem: string };

// Documentos ativos sem caixa, dos mais novos aos mais antigos (até 200 por vez).
export async function listarSemEndereco(secretaria?: string): Promise<SemEndereco[]> {
  if (emDemo()) return [];
  const sb = await clienteSessao();
  if (!sb) return [];
  let q = sb
    .from("documentos")
    .select("id, tipo, modalidade, numero, ano, objeto, secretaria_id, origem")
    .eq("ativo", true)
    .is("caixa_id", null)
    .order("criado_em", { ascending: false })
    .limit(200);
  if (secretaria) q = q.eq("secretaria_id", secretaria);
  const { data } = await q;
  return (data ?? []).map((d) => ({
    id: d.id,
    titulo: tituloDocumento({ tipo: d.tipo, modalidade: d.modalidade, numero: d.numero, ano: d.ano }),
    objeto: d.objeto,
    ano: d.ano,
    secretaria_id: d.secretaria_id,
    origem: d.origem,
  }));
}

// Documentos importados que ainda não têm caixa.
export async function contarSemEndereco(): Promise<number> {
  if (emDemo()) return 1198;
  const sb = await clienteSessao();
  if (!sb) return 0;
  const { count } = await sb.from("documentos").select("id", { count: "exact", head: true }).eq("ativo", true).is("caixa_id", null);
  return count ?? 0;
}
