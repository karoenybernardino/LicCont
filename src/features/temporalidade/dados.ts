import "server-only";
import { clienteSessao } from "@/lib/supabase/servidor";
import type { Usuario } from "@/features/sessao/dal";
import { emDemo } from "@/features/demo/dados";
import { tituloDocumento } from "@/features/documentos/titulo";
import type { Modalidade, Tipo } from "@/features/documentos/tipos";
import { NUMERO_SO_POR_ENDERECO_DEMO, REGRAS_EDITAVEIS_DEMO, termosDemo } from "@/features/demo/temporalidade";
import { classeDocumento, estadoDoPrazo, hojeSaoPaulo, type Classe, type Destinacao, type Regra } from "./regras";
import { MODELO_EMPRESTIMO_PADRAO, MODELO_PADRAO, type ModeloTermo } from "./termo";
import type { ItemTermo, Termo, TermoCompleto } from "./tipos";

export type { ItemTermo, Termo, TermoCompleto } from "./tipos";

// Leitura pela sessão do usuário: o RLS devolve só a prefeitura e as
// secretarias permitidas. A conta do prazo é a de regras.ts (o banco repete
// a mesma em app.motivo_inelegivel e confere de novo ao gerar e aprovar).

export type ItemFila = { id: string; titulo: string; caixa: string; secretariaId: string; vencimento: string; emDias: number };
export type ResumoReal = { vencem90: number; prontos: number; permanentes: number };
export type LeituraTemporalidade = { resumo: ResumoReal; prontos: ItemFila[]; aVencer: (ItemFila & { posicao: string })[] };

export async function lerRegras(): Promise<Regra[]> {
  if (emDemo()) return REGRAS_EDITAVEIS_DEMO;
  const sb = await clienteSessao();
  if (!sb) return [];
  const { data } = await sb.from("tabela_temporalidade").select("classe, prazo_corrente_anos, prazo_intermediaria_anos, destinacao").order("classe");
  return (data ?? []).map((r) => ({
    classe: r.classe as Classe, corrente: r.prazo_corrente_anos, intermediaria: r.prazo_intermediaria_anos, destinacao: r.destinacao as Destinacao,
  }));
}

// Modelo do termo da prefeitura; sem linha salva, vale o texto-padrão.
export async function lerModelo(tipo: "eliminacao" | "emprestimo" = "eliminacao"): Promise<ModeloTermo> {
  const padrao = tipo === "emprestimo" ? MODELO_EMPRESTIMO_PADRAO : MODELO_PADRAO;
  if (emDemo()) return padrao;
  const sb = await clienteSessao();
  if (!sb) return padrao;
  const { data } = await sb.from("modelos_termo").select("base_legal, assinaturas").eq("tipo", tipo).maybeSingle();
  return data ? { baseLegal: data.base_legal, assinaturas: data.assinaturas } : padrao;
}

type LinhaDoc = {
  id: string; tipo: Tipo; modalidade: Modalidade | null; numero: string; ano: number; secretaria_id: string;
  vigencia_fim: string | null; encerrado_em: string | null;
  caixas: { numero: number; niveis: { numero: number; modulos: { numero: number; ruas: { codigo: string } } } } | null;
};

const PAGINA = 1000;
const MAX_PAGINAS = 10; // shortcut: até 10 mil documentos com data; acima disso, paginar no banco (função com filtro de prazo).

async function documentosComData() {
  const sb = await clienteSessao();
  if (!sb) return [];
  const linhas: LinhaDoc[] = [];
  for (let p = 0; p < MAX_PAGINAS; p++) {
    const { data, error } = await sb
      .from("documentos")
      .select("id, tipo, modalidade, numero, ano, secretaria_id, vigencia_fim, encerrado_em, caixas(numero, niveis(numero, modulos(numero, ruas(codigo))))")
      .eq("ativo", true)
      .or("vigencia_fim.not.is.null,encerrado_em.not.is.null")
      .order("id")
      .range(p * PAGINA, (p + 1) * PAGINA - 1);
    if (error) throw new Error("Não foi possível ler os documentos.");
    linhas.push(...(data as unknown as LinhaDoc[]));
    if (!data || data.length < PAGINA) break;
  }
  return linhas;
}

export const codigoCaixa = (c: LinhaDoc["caixas"]) =>
  c ? `${c.niveis.modulos.ruas.codigo}-M${c.niveis.modulos.numero}-N${c.niveis.numero}-C${String(c.numero).padStart(2, "0")}` : "—";

// Cartões, fila de eliminação e prazos a vencer (só leitura).
export async function lerTemporalidadeReal(): Promise<LeituraTemporalidade> {
  const sb = await clienteSessao();
  const vazio = { resumo: { vencem90: 0, prontos: 0, permanentes: 0 }, prontos: [], aVencer: [] };
  if (!sb) return vazio;
  const regras = await lerRegras();
  if (regras.length === 0) return vazio;
  const [docs, abertos] = await Promise.all([
    documentosComData(),
    sb.from("descarte_itens").select("documento_id").eq("aberto", true),
  ]);
  const emTermo = new Set((abertos.data ?? []).map((i) => i.documento_id as string));
  const hoje = hojeSaoPaulo();
  const prontos: ItemFila[] = [];
  const aVencer: (ItemFila & { posicao: string })[] = [];
  let permanentes = 0;
  let vencem90 = 0;
  for (const d of docs) {
    const e = estadoDoPrazo({ tipo: d.tipo, modalidade: d.modalidade, vigencia_fim: d.vigencia_fim, encerrado_em: d.encerrado_em }, regras, hoje);
    if (e.estado === "permanente") permanentes++;
    if (e.estado !== "pronto" && e.estado !== "vence") continue;
    const item = { id: d.id, titulo: tituloDocumento(d), caixa: codigoCaixa(d.caixas), secretariaId: d.secretaria_id, vencimento: e.vencimento, emDias: e.emDias };
    if (e.estado === "vence") {
      vencem90++;
      aVencer.push({ ...item, posicao: item.caixa });
    } else if (!emTermo.has(d.id)) prontos.push(item);
  }
  prontos.sort((a, b) => a.vencimento.localeCompare(b.vencimento));
  aVencer.sort((a, b) => a.emDias - b.emDias);
  return { resumo: { vencem90, prontos: prontos.length, permanentes }, prontos, aVencer };
}

export async function listarTermos(): Promise<Termo[]> {
  if (emDemo()) return termosDemo(hojeSaoPaulo()).filter((t) => t.numero !== NUMERO_SO_POR_ENDERECO_DEMO).map((t) => ({ ...t, documentos: undefined, prefeitura: undefined }));
  const sb = await clienteSessao();
  if (!sb) return [];
  const { data } = await sb
    .from("descartes")
    .select("id, numero, ano, situacao, secretaria_id, secretarias(nome), gerado_por, gerado_em, edital_publicado_em, aprovado_em, cancelado_em, observacao, descarte_itens(count)")
    .order("ano", { ascending: false })
    .order("numero", { ascending: false })
    .limit(50);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map((t) => ({
    id: t.id, numero: t.numero, ano: t.ano, situacao: t.situacao, secretariaId: t.secretaria_id, secretaria: t.secretarias?.nome ?? "",
    geradoPor: t.gerado_por, geradoEm: t.gerado_em, editalEm: t.edital_publicado_em, aprovadoEm: t.aprovado_em, canceladoEm: t.cancelado_em,
    observacao: t.observacao, itens: t.descarte_itens?.[0]?.count ?? 0,
  }));
}

const ano = (iso: string | null) => (iso ? iso.slice(0, 4) : "—");

export async function obterTermo(id: string): Promise<TermoCompleto | null> {
  if (emDemo()) return termosDemo(hojeSaoPaulo()).find((t) => t.id === id) ?? null;
  const sb = await clienteSessao();
  if (!sb) return null;
  const { data, error } = await sb
    .from("descartes")
    .select(
      "id, numero, ano, situacao, secretaria_id, gerado_por, gerado_em, edital_publicado_em, aprovado_em, cancelado_em, observacao, secretarias(nome), prefeituras(nome), descarte_itens(documentos(tipo, modalidade, numero, ano, objeto, vigencia_inicio, vigencia_fim, encerrado_em, caixas(numero, niveis(numero, modulos(numero, ruas(codigo))))))",
    )
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const t = data as any;
  const regras = await lerRegras();
  const hoje = hojeSaoPaulo();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const documentos: ItemTermo[] = (t.descarte_itens ?? []).map((i: any) => {
    const d = i.documentos;
    const prazo = estadoDoPrazo(d, regras, hoje);
    const contrato = d.tipo === "contrato";
    const fim = contrato ? d.vigencia_fim : d.encerrado_em;
    return {
      titulo: tituloDocumento(d), objeto: d.objeto, caixa: codigoCaixa(d.caixas), classe: classeDocumento(d.tipo, d.modalidade),
      inicio: contrato ? d.vigencia_inicio : null, fim,
      extremos: `${contrato ? ano(d.vigencia_inicio) : d.ano} – ${ano(fim)}`,
      vencimento: "vencimento" in prazo ? prazo.vencimento : null,
    };
  });
  documentos.sort((a, b) => a.titulo.localeCompare(b.titulo, "pt-BR", { numeric: true }));
  return {
    id: t.id, numero: t.numero, ano: t.ano, situacao: t.situacao, secretariaId: t.secretaria_id, secretaria: t.secretarias?.nome ?? "",
    geradoPor: t.gerado_por, geradoEm: t.gerado_em, editalEm: t.edital_publicado_em, aprovadoEm: t.aprovado_em, canceladoEm: t.cancelado_em,
    observacao: t.observacao, itens: documentos.length, prefeitura: t.prefeituras?.nome ?? "", documentos,
  };
}

// Pode gerar termo: administrador ou coordenador de alguma secretaria.
export async function podeGerarTermo(u: Usuario) {
  if (u.administrador) return true;
  if (emDemo()) return false;
  const sb = await clienteSessao();
  if (!sb) return false;
  const { data } = await sb.from("vinculos").select("id").eq("usuario_id", u.id).eq("papel", "coordenador").limit(1);
  return !!data?.length;
}
