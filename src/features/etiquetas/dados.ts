import "server-only";
import { clienteSessao } from "@/lib/supabase/servidor";
import { SECRETARIAS_DEMO, emDemo } from "@/features/demo/dados";
import { DOCUMENTOS_DEMO, caixaDemo } from "@/features/demo/documentos";
import type { Modalidade, Tipo } from "@/features/documentos/tipos";
import { TIPOS } from "@/features/documentos/tipos";
import { tituloDocumento } from "@/features/documentos/titulo";
import { codigoPosicao } from "@/features/estrutura/ocupacao";

// Uma linha por caixa (a do documento mais recente): é o que a etiqueta mostra.
export type CaixaEtiqueta = {
  id: string;
  rua: string;
  modulo: number;
  nivel: number;
  caixa: number;
  codigo: string;
  titulo: string;
  detalhe: string;
};

const LIMITE = 1000;

// Leitura pela sessão: o RLS devolve só a prefeitura e as secretarias permitidas.
export async function listarCaixasParaEtiqueta(): Promise<CaixaEtiqueta[]> {
  const vistas = new Map<string, CaixaEtiqueta>();
  const guardar = (id: string, p: { rua: string; modulo: number; nivel: number; caixa: number }, d: { tipo: Tipo; modalidade: Modalidade | null; numero: string; ano: number }, secretaria: string) => {
    if (vistas.has(id)) return;
    vistas.set(id, { id, ...p, codigo: codigoPosicao(p.rua, p.modulo, p.nivel, p.caixa), titulo: tituloDocumento(d), detalhe: `${TIPOS[d.tipo]} · ${secretaria} · ${d.ano}` });
  };
  if (emDemo()) {
    for (const d of DOCUMENTOS_DEMO) {
      const cx = caixaDemo(d.caixa_id);
      if (cx) guardar(d.caixa_id, { rua: cx.rua.codigo, modulo: cx.modulo.numero, nivel: cx.nivel.numero, caixa: cx.numero }, d, SECRETARIAS_DEMO.find((s) => s.id === d.secretaria_id)?.nome ?? "");
    }
  } else {
    const sb = await clienteSessao();
    if (!sb) return [];
    const { data, error } = await sb
      .from("documentos")
      .select("tipo, modalidade, numero, ano, caixa_id, secretarias(nome), caixas(numero, niveis(numero, modulos(numero, ruas(codigo))))")
      .eq("ativo", true)
      .order("criado_em", { ascending: false })
      .limit(LIMITE);
    if (error) throw new Error("Não foi possível ler as caixas.");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const d of (data ?? []) as any[]) {
      const c = d.caixas;
      if (!c) continue;
      guardar(d.caixa_id, { rua: c.niveis.modulos.ruas.codigo, modulo: c.niveis.modulos.numero, nivel: c.niveis.numero, caixa: c.numero }, d, d.secretarias?.nome ?? "");
    }
  }
  return [...vistas.values()].sort((a, b) => a.codigo.localeCompare(b.codigo, "pt-BR", { numeric: true }));
}
