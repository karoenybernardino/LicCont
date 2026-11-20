import "server-only";
import { clienteSessao } from "@/lib/supabase/servidor";
import { SECRETARIAS_DEMO, emDemo } from "@/features/demo/dados";
import { CLASSES_DEMO } from "@/features/demo/classificacao";
import { DOCUMENTOS_DEMO, caixaDemo } from "@/features/demo/documentos";
import type { Modalidade, Tipo } from "@/features/documentos/tipos";
import { MODALIDADES } from "@/features/documentos/tipos";
import { tituloDocumento } from "@/features/documentos/titulo";
import { CAIXAS_GERAIS_DEMO } from "@/features/documentos/dados";
import { lerRegras } from "@/features/temporalidade/dados";
import { prazoDeGuarda } from "@/features/temporalidade/classes-tabela";
import type { Regra } from "@/features/temporalidade/regras";
import type { ItemConteudo } from "./pdf";

// Tudo que a etiqueta mostra vem do cadastro: nada é digitado na hora. Leitura pela sessão da pessoa:
// o RLS devolve só a prefeitura, as secretarias e os grupos documentais que ela pode ver.
export type CaixaEtiqueta = {
  id: string;
  sequencial: number;
  numero: string; // "0001"
  localizacao: string; // "Rua B · Módulo 2 · Nível 4"
  titulo: string; // "LICITAÇÃO – 2026"
  classeId: string | null;
  classe: string;
  tipologia: string | null;
  codigo: string;
  prazo: string;
  volume: { n: number; total: number } | null;
  itens: ItemConteudo[];
  secretariaIds: string[];
  anos: number[];
  impressa: string | null; // data ISO da última impressão
  // Etiqueta geral: vem do cadastro da caixa.
  orgao: "prefeitura" | "camara";
  tipo: "geral" | "detalhada";
  etiquetaGeral: boolean;
  fundo: string | null;
  setor: string | null;
  meses: number[];
  anoLimite: number | null;
  digitalizada: boolean;
  observacao: string | null;
};
export type DocumentoEtiqueta = {
  id: string;
  titulo: string;
  secretariaId: string;
  secretaria: string;
  objeto: string;
  data: string; // dd/mm/aaaa ou vazio
  observacao: string | null;
  classeId: string | null;
  classe: string;
  codigo: string;
  caixaNumero: string;
  localizacao: string;
  ano: number;
  impressa: string | null;
};
export type BaseEtiquetas = {
  caixas: CaixaEtiqueta[];
  documentos: DocumentoEtiqueta[];
  secretarias: { id: string; nome: string }[];
  classes: { id: string; nome: string; codigo: string }[];
  anos: number[];
};

const LIMITE_CAIXAS = 2000;
const LIMITE_DOCUMENTOS = 5000;
const PAGINA = 1000;

export const numeroCaixa = (n: number) => String(n).padStart(4, "0");
export const localizacaoPorExtenso = (rua: string, modulo: number, nivel: number) => `Rua ${rua} · Módulo ${modulo} · Nível ${nivel}`;

const CAIXA_PADRAO = {
  orgao: "prefeitura" as const, tipo: "detalhada" as const, etiquetaGeral: false, fundo: null, setor: null, meses: [] as number[], anoLimite: null, digitalizada: false,
  observacao: null, codigoClassificacao: null, prazoAnos: null, tipologia: null,
};
type DocBruto = {
  id: string; tipo: Tipo; modalidade: Modalidade | null; numero: string; ano: number; objeto: string; secretariaId: string; secretaria: string;
  volume: number; classeId: string | null; tipologia: string | null; observacao: string | null; caixaId: string;
};
type CaixaBruta = { id: string; sequencial: number; rua: string; modulo: number; nivel: number; volume: number | null; volumesTotal: number | null; classeId: string | null;
  orgao: "prefeitura" | "camara"; tipo: "geral" | "detalhada"; etiquetaGeral: boolean; fundo: string | null; setor: string | null; meses: number[];
  anoLimite: number | null; digitalizada: boolean; observacao: string | null; codigoClassificacao: string | null; prazoAnos: number | null; tipologia: string | null;
};

// "LICITAÇÃO", "CONTRATO" ou o nome do grupo; "– 2026" ou "– 2024–2026".
export function tituloDaCaixa(docs: { tipo: Tipo; ano: number }[], grupoDaClasse: string | null) {
  const rotulos = new Set(docs.map((d) => (d.tipo === "licitacao" ? "LICITAÇÃO" : d.tipo === "contrato" ? "CONTRATO" : (grupoDaClasse ?? "DOCUMENTOS").toUpperCase())));
  const nome = rotulos.size === 1 ? [...rotulos][0] : (grupoDaClasse ?? "DIVERSOS").toUpperCase();
  const anos = docs.map((d) => d.ano);
  const de = Math.min(...anos);
  const ate = Math.max(...anos);
  return `${nome} – ${de === ate ? de : `${de}–${ate}`}`;
}

function montarBase(caixas: CaixaBruta[], docs: DocBruto[], regras: Regra[], secretarias: { id: string; nome: string }[], impressoes: Map<string, string>): BaseEtiquetas {
  const regra = new Map(regras.map((r) => [r.id, r]));
  const porCaixa = new Map<string, DocBruto[]>();
  for (const d of docs) (porCaixa.get(d.caixaId) ?? porCaixa.set(d.caixaId, []).get(d.caixaId)!).push(d);
  const lugar = new Map(caixas.map((c) => [c.id, c]));
  const saidaCaixas: CaixaEtiqueta[] = [];
  for (const c of caixas) {
    const lista = (porCaixa.get(c.id) ?? []).sort((a, b) => a.ano - b.ano || a.numero.localeCompare(b.numero, "pt-BR", { numeric: true }));
    // Caixa de arquivo geral não tem documentos cadastrados; a detalhada sem documento não tem o que etiquetar.
    if (!lista.length && c.tipo !== "geral") continue;
    // Classe: a da caixa; senão a mais usada pelos documentos; senão pelo código de classificação informado.
    const regraDoCodigo = c.codigoClassificacao ? regras.find((x) => x.codigo === c.codigoClassificacao)?.id : undefined;
    const usos = new Map<string, number>();
    for (const d of lista) if (d.classeId) usos.set(d.classeId, (usos.get(d.classeId) ?? 0) + 1);
    const classeId = c.classeId ?? [...usos.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? regraDoCodigo ?? null;
    const r = classeId ? regra.get(classeId) : undefined;
    saidaCaixas.push({
      id: c.id, sequencial: c.sequencial, numero: numeroCaixa(c.sequencial), localizacao: localizacaoPorExtenso(c.rua, c.modulo, c.nivel),
      titulo: lista.length ? tituloDaCaixa(lista, r?.grupo ?? null) : "ARQUIVO GERAL", classeId, classe: r?.classe ?? "Sem classe", tipologia: lista.find((d) => d.tipologia)?.tipologia ?? c.tipologia,
      codigo: r?.codigo ?? c.codigoClassificacao ?? "—",
      prazo: r ? prazoDeGuarda(r) : c.prazoAnos != null ? `${c.prazoAnos} ${c.prazoAnos === 1 ? "ano" : "anos"}` : "Sem classe na tabela de temporalidade",
      volume: c.volume && c.volumesTotal ? { n: c.volume, total: c.volumesTotal } : null,
      itens: lista.map((d) => ({
        modalidade: d.tipo === "contrato" ? "Contrato" : d.tipo === "outro" ? (d.tipologia ?? "Documento") : d.modalidade ? MODALIDADES[d.modalidade] : "Licitação",
        numeroAno: d.numero.includes("/") ? d.numero : `${d.numero}/${d.ano}`, secretaria: d.secretaria, objeto: d.objeto, volume: d.volume,
      })),
      secretariaIds: [...new Set(lista.map((d) => d.secretariaId))], anos: [...new Set(lista.map((d) => d.ano))],
      impressa: impressoes.get(`caixa:${c.id}`) ?? null,
      orgao: c.orgao, tipo: c.tipo, etiquetaGeral: c.etiquetaGeral, fundo: c.fundo, setor: c.setor, meses: c.meses, anoLimite: c.anoLimite, digitalizada: c.digitalizada, observacao: c.observacao,
    });
  }
  saidaCaixas.sort((a, b) => a.orgao.localeCompare(b.orgao) || a.sequencial - b.sequencial);
  const saidaDocs: DocumentoEtiqueta[] = docs
    .filter((d) => lugar.has(d.caixaId))
    .map((d) => {
      const c = lugar.get(d.caixaId)!;
      const r = d.classeId ? regra.get(d.classeId) : undefined;
      return {
        id: d.id, titulo: tituloDocumento({ ...d }), secretariaId: d.secretariaId, secretaria: d.secretaria, objeto: d.objeto, data: String(d.ano),
        observacao: d.observacao, classeId: d.classeId, classe: r?.classe ?? "Sem classe", codigo: r?.codigo ?? "—", caixaNumero: numeroCaixa(c.sequencial),
        localizacao: localizacaoPorExtenso(c.rua, c.modulo, c.nivel), ano: d.ano, impressa: impressoes.get(`documento:${d.id}`) ?? null,
      };
    })
    .sort((a, b) => a.caixaNumero.localeCompare(b.caixaNumero) || a.titulo.localeCompare(b.titulo, "pt-BR", { numeric: true }));
  const usadas = new Set(saidaDocs.map((d) => d.classeId).filter(Boolean));
  return {
    caixas: saidaCaixas, documentos: saidaDocs, secretarias,
    classes: regras.filter((r) => usadas.has(r.id)).map((r) => ({ id: r.id, nome: r.classe, codigo: r.codigo })),
    anos: [...new Set(saidaDocs.map((d) => d.ano))].sort((a, b) => b - a),
  };
}

export async function lerBaseEtiquetas(): Promise<BaseEtiquetas> {
  if (emDemo()) {
    const caixas = new Map<string, CaixaBruta>();
    const docs: DocBruto[] = [];
    DOCUMENTOS_DEMO.forEach((d, i) => {
      const cx = caixaDemo(d.caixa_id);
      if (!cx) return;
      if (!caixas.has(d.caixa_id)) caixas.set(d.caixa_id, { id: d.caixa_id, sequencial: caixas.size + 1, rua: cx.rua.codigo, modulo: cx.modulo.numero, nivel: cx.nivel.numero, volume: null, volumesTotal: null, classeId: null, ...CAIXA_PADRAO });
      docs.push({
        id: d.id, tipo: d.tipo, modalidade: d.modalidade, numero: d.numero, ano: d.ano, objeto: d.objeto, secretariaId: d.secretaria_id,
        secretaria: SECRETARIAS_DEMO.find((s) => s.id === d.secretaria_id)?.nome ?? "", volume: i % 17 === 0 ? 2 : 1,
        classeId: CLASSES_DEMO[d.tipo === "contrato" ? 1 : 0].id, tipologia: null, observacao: i === 0 ? "Falta o termo aditivo" : null, caixaId: d.caixa_id,
      });
    });
    // Caixas gerais fictícias (Câmara numera à parte; as da Prefeitura seguem a sequência).
    let proxima = caixas.size;
    for (const g of CAIXAS_GERAIS_DEMO) {
      caixas.set(g.id, {
        id: g.id, sequencial: g.orgao === "camara" ? g.sequencial : ++proxima, rua: g.endereco.split("-")[0], modulo: 1, nivel: 1, volume: null, volumesTotal: null,
        classeId: CLASSES_DEMO[0].id, orgao: g.orgao, tipo: "geral", etiquetaGeral: g.etiquetaGeral, fundo: g.fundo, setor: g.setor, meses: g.meses, anoLimite: g.anoLimite,
        digitalizada: g.digitalizada, observacao: g.id.endsWith("3") ? "Documentos soltos, sem capa" : null, codigoClassificacao: g.codigoClassificacao, prazoAnos: g.prazoAnos, tipologia: null,
      });
    }
    return montarBase([...caixas.values()], docs, CLASSES_DEMO, SECRETARIAS_DEMO.map((s) => ({ id: s.id, nome: s.nome })), new Map());
  }
  const sb = await clienteSessao();
  if (!sb) return { caixas: [], documentos: [], secretarias: [], classes: [], anos: [] };
  const regras = await lerRegras();
  const [c, secs, imp] = await Promise.all([
    sb.from("caixas").select("id, sequencial, volume, volumes_total, classe_id, orgao, tipo, etiqueta_geral, fundo, setor, meses, ano_limite, digitalizada, observacao, codigo_classificacao, prazo_anos, tipologias(nome), niveis(numero, modulos(numero, ruas(codigo)))").eq("ativo", true).order("sequencial").limit(LIMITE_CAIXAS),
    sb.from("secretarias").select("id, nome").eq("ativa", true).order("nome"),
    sb.from("etiqueta_impressoes").select("tipo, caixa_id, documento_id, impresso_em").order("impresso_em", { ascending: false }).limit(10_000),
  ]);
  if (c.error) throw new Error("Não foi possível ler as caixas.");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const caixas: CaixaBruta[] = ((c.data ?? []) as any[]).filter((x) => x.niveis).map((x) => ({
    id: x.id, sequencial: x.sequencial, rua: x.niveis.modulos.ruas.codigo, modulo: x.niveis.modulos.numero, nivel: x.niveis.numero,
    volume: x.volume, volumesTotal: x.volumes_total, classeId: x.classe_id,
    orgao: x.orgao, tipo: x.tipo, etiquetaGeral: !!x.etiqueta_geral, fundo: x.fundo, setor: x.setor, meses: x.meses ?? [], anoLimite: x.ano_limite, digitalizada: !!x.digitalizada,
    observacao: x.observacao, codigoClassificacao: x.codigo_classificacao, prazoAnos: x.prazo_anos, tipologia: x.tipologias?.nome ?? null,
  }));
  const impressoes = new Map<string, string>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const i of (imp.data ?? []) as any[]) {
    const chave = i.tipo === "documento" ? `documento:${i.documento_id}` : "caixa:" + i.caixa_id;
    // Folha de conteúdo e etiqueta da caixa contam juntas como "caixa impressa".
    if (!impressoes.has(chave)) impressoes.set(chave, i.impresso_em);
  }
  const docs: DocBruto[] = [];
  for (let p = 0; p * PAGINA < LIMITE_DOCUMENTOS; p++) {
    const { data, error } = await sb
      .from("documentos")
      .select("id, tipo, modalidade, numero, ano, objeto, secretaria_id, secretarias(nome), volume, classe_id, tipologias(nome), observacao, caixa_id")
      .eq("ativo", true)
      .not("caixa_id", "is", null)
      .order("id")
      .range(p * PAGINA, (p + 1) * PAGINA - 1);
    if (error) throw new Error("Não foi possível ler os documentos.");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const d of (data ?? []) as any[]) {
      docs.push({
        id: d.id, tipo: d.tipo, modalidade: d.modalidade, numero: d.numero, ano: d.ano, objeto: d.objeto, secretariaId: d.secretaria_id, secretaria: d.secretarias?.nome ?? "",
        volume: d.volume ?? 1, classeId: d.classe_id, tipologia: d.tipologias?.nome ?? null, observacao: d.observacao, caixaId: d.caixa_id,
      });
    }
    if (!data || data.length < PAGINA) break;
  }
  return montarBase(caixas, docs, regras, (secs.data ?? []) as { id: string; nome: string }[], impressoes);
}
