import "server-only";
import { clienteSessao } from "@/lib/supabase/servidor";
import { emDemo } from "@/features/demo/dados";
import { tituloDocumento } from "@/features/documentos/titulo";
import { listarEmprestimos, lerTemporalidade } from "@/features/movimento/dados";
import { situacaoEmprestimo } from "@/features/movimento/situacao";

export type Resumo = {
  documentos: { total: number; licitacoes: number; contratos: number; sem_endereco: number; com_pdf: number; sem_pdf: number };
  por_ano: { ano: number; licitacoes: number; contratos: number }[];
  tce: { a_conferir: number; duplicados: number };
  emprestimos: { abertos: number; atrasados: number; mais_antigo_dias: number | null };
};
export type Caixas = { total: number; com_documento: number; cheias: number; com_espaco: number; vazias: number };
export type Painel = {
  resumo: Resumo;
  caixas: Caixas;
  atrasados: { titulo: string; quem: string; setor: string; dias: number }[];
  descarte: { total: number; itens: { titulo: string; emDias: number }[] };
  contratos: { total: number; itens: { titulo: string; empresa: string | null; valor: number | null; emDias: number }[] };
};

const DEMO: Painel = {
  resumo: {
    documentos: { total: 3842, licitacoes: 2296, contratos: 1546, sem_endereco: 38, com_pdf: 2728, sem_pdf: 1114 },
    por_ano: [2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026].map((ano, i) => ({ ano, licitacoes: 180 + i * 30, contratos: 120 + i * 20 })),
    tce: { a_conferir: 38, duplicados: 5 },
    emprestimos: { abertos: 27, atrasados: 6, mais_antigo_dias: 41 },
  },
  caixas: { total: 412, com_documento: 377, cheias: 214, com_espaco: 163, vazias: 35 },
  atrasados: [{ titulo: "Contrato 041/2022", quem: "Mário S.", setor: "Obras", dias: 41 }],
  descarte: { total: 18, itens: [{ titulo: "Dispensa 011/2016", emDias: 17 }] },
  contratos: { total: 9, itens: [{ titulo: "Contrato 012/2025", empresa: "Frio Sul Ltda.", valor: 72900, emDias: 12 }] },
};

const hoje = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
const somar = (iso: string, d: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + d * 86_400_000).toISOString().slice(0, 10);

// Os números pesados vêm de funções do banco que respeitam o RLS; as listas
// curtas reaproveitam as leituras das outras telas.
export async function lerPainel(secretaria: string | null): Promise<Painel> {
  if (emDemo()) return DEMO;
  const sb = await clienteSessao();
  if (!sb) throw new Error("Não foi possível ler o painel.");
  const inicio = hoje();
  const [resumo, caixas, emprestimos, temporalidade, venc] = await Promise.all([
    sb.rpc("painel_resumo", { p_secretaria: secretaria }),
    sb.rpc("painel_caixas"),
    listarEmprestimos(),
    lerTemporalidade(),
    (() => {
      let q = sb
        .from("documentos")
        .select("tipo, modalidade, numero, ano, empresa, valor, vigencia_fim", { count: "exact" })
        .eq("ativo", true)
        .eq("tipo", "contrato")
        .gte("vigencia_fim", inicio)
        .lte("vigencia_fim", somar(inicio, 60))
        .order("vigencia_fim", { ascending: true })
        .limit(3);
      if (secretaria) q = q.eq("secretaria_id", secretaria);
      return q;
    })(),
  ]);
  if (resumo.error || caixas.error || !resumo.data || !caixas.data) throw new Error("Não foi possível ler o painel.");
  const atrasados = emprestimos
    .filter((e) => !e.devolvido && situacaoEmprestimo(e.prazo).atrasado)
    .map((e) => ({ titulo: e.titulo, quem: e.quem, setor: e.setor, dias: Math.round((Date.parse(`${inicio}T00:00:00Z`) - Date.parse(`${e.prazo}T00:00:00Z`)) / 86_400_000) }))
    .sort((a, b) => b.dias - a.dias)
    .slice(0, 3);
  return {
    resumo: resumo.data as Resumo,
    caixas: caixas.data as Caixas,
    atrasados,
    descarte: { total: temporalidade.resumo.vencem90, itens: temporalidade.aVencer.slice(0, 3).map((p) => ({ titulo: p.titulo, emDias: p.emDias })) },
    contratos: {
      total: venc.count ?? 0,
      itens: (venc.data ?? []).map((c) => ({
        titulo: tituloDocumento({ tipo: c.tipo, modalidade: c.modalidade, numero: c.numero, ano: c.ano }),
        empresa: c.empresa,
        valor: c.valor === null ? null : Number(c.valor),
        emDias: Math.round((Date.parse(`${c.vigencia_fim}T00:00:00Z`) - Date.parse(`${inicio}T00:00:00Z`)) / 86_400_000),
      })),
    },
  };
}

export const porcento = (parte: number, todo: number) => (todo > 0 ? Math.round((parte / todo) * 100) : 0);
