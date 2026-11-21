import "server-only";
import { headers } from "next/headers";
import { clienteSessao } from "@/lib/supabase/servidor";
import { emDemo } from "@/features/demo/dados";
import { lerBaseEtiquetas } from "./dados";
import { gerarEtiquetasPdf, type CaixaPdf, type DocumentoPdf, type MarcaPdf } from "./pdf";

export type TipoEtiqueta = "caixa" | "conteudo" | "documento";
export const TIPOS_ETIQUETA: TipoEtiqueta[] = ["caixa", "conteudo", "documento"];
export const MAX_ETIQUETAS = 500;

// Endereço do site para o QR: o do pedido atual (nunca vem do formulário).
async function origemDoSite() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

type Cliente = NonNullable<Awaited<ReturnType<typeof clienteSessao>>>;

async function baixarLogo(sb: Cliente, caminho: string | null): Promise<Uint8Array | null> {
  if (!caminho) return null;
  const r = await sb.storage.from("marcas").download(caminho);
  return r.data ? new Uint8Array(await r.data.arrayBuffer()) : null;
}

async function marcaDoOrgao(sb: Cliente | null): Promise<MarcaPdf> {
  if (emDemo() || !sb) return { orgaoNome: "Prefeitura Fictícia de Exemplo", logoOrgao: null, logoParceira: null, logoCamara: null };
  const { data } = await sb.rpc("etiqueta_marca");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const m = ((data ?? []) as any[])[0];
  if (!m) return { orgaoNome: "", logoOrgao: null, logoParceira: null, logoCamara: null };
  const [logoOrgao, logoParceira, logoCamara] = await Promise.all([baixarLogo(sb, m.logo_caminho), baixarLogo(sb, m.parceira_logo_caminho), baixarLogo(sb, m.logo_camara_caminho)]);
  return { orgaoNome: m.nome_etiqueta || m.nome, logoOrgao, logoParceira, logoCamara };
}

// Código aleatório do QR da caixa (tabela etiquetas): cria o que falta e lê. Nunca o id do banco.
async function codigosDasCaixas(sb: Cliente | null, prefeitura: string, ids: string[]): Promise<Map<string, string>> {
  if (emDemo() || !sb) return new Map(ids.map((id) => [id, id.replace(/-/g, "").padEnd(32, "0").slice(0, 32)]));
  await sb.from("etiquetas").upsert(ids.map((caixa_id) => ({ prefeitura_id: prefeitura, caixa_id, tamanho: "media" })), { onConflict: "caixa_id", ignoreDuplicates: true });
  const { data } = await sb.from("etiquetas").select("caixa_id, codigo").in("caixa_id", ids);
  return new Map((data ?? []).map((e) => [e.caixa_id as string, e.codigo as string]));
}

async function codigosDosDocumentos(sb: Cliente | null, ids: string[]): Promise<Map<string, string>> {
  if (emDemo() || !sb) return new Map(ids.map((id) => [id, id.replace(/-/g, "").padEnd(32, "0").slice(0, 32)]));
  const { data } = await sb.from("documentos").select("id, qr_codigo").in("id", ids);
  return new Map((data ?? []).map((d) => [d.id as string, d.qr_codigo as string]));
}

// Monta o PDF do que foi escolhido. Cada campo vem do cadastro (nada digitado na etiqueta).
export async function montarEtiquetas(e: { tipos: TipoEtiqueta[]; caixas: string[]; documentos: string[]; prefeitura: string; dividir?: boolean }): Promise<{ pdf: Uint8Array; impressoes: { tipo: TipoEtiqueta; id: string }[]; total: number }> {
  const [base, origem] = await Promise.all([lerBaseEtiquetas(), origemDoSite()]);
  const sb = emDemo() ? null : await clienteSessao();
  const caixas = base.caixas.filter((c) => e.caixas.includes(c.id)).slice(0, MAX_ETIQUETAS);
  const docs = base.documentos.filter((d) => e.documentos.includes(d.id)).slice(0, MAX_ETIQUETAS);
  const querCaixa = e.tipos.includes("caixa");
  const querConteudo = e.tipos.includes("conteudo");
  const querDoc = e.tipos.includes("documento");
  const [marca, codCaixas, codDocs] = await Promise.all([
    marcaDoOrgao(sb),
    codigosDasCaixas(sb, e.prefeitura, querCaixa || querConteudo ? caixas.map((c) => c.id) : []),
    codigosDosDocumentos(sb, querDoc ? docs.map((d) => d.id) : []),
  ]);
  const paraCaixa = (c: (typeof caixas)[number]): CaixaPdf => ({
    numero: c.numero, titulo: c.titulo, volume: c.volume, classe: c.classe, tipologia: c.tipologia, codigo: c.codigo, prazo: c.prazo, localizacao: c.localizacao,
    url: `${origem}/q/${codCaixas.get(c.id) ?? ""}`, itens: c.itens,
    orgao: c.orgao, tipo: c.tipo, etiquetaGeral: c.etiquetaGeral, fundo: c.fundo, setor: c.setor, meses: c.meses, anoLimite: c.anoLimite, digitalizada: c.digitalizada,
    observacao: c.observacao, dividir: e.dividir ?? false,
  });
  const paraDoc = (d: (typeof docs)[number]): DocumentoPdf => ({
    titulo: d.titulo, secretaria: d.secretaria, objeto: d.objeto, data: d.data, observacao: d.observacao, classe: d.classe, codigo: d.codigo, caixa: d.caixaNumero,
    localizacao: d.localizacao, url: `${origem}/q/${codDocs.get(d.id) ?? ""}`,
  });
  const pdf = await gerarEtiquetasPdf({
    marca,
    caixas: querCaixa ? caixas.map(paraCaixa) : [],
    conteudos: querConteudo ? caixas.map(paraCaixa) : [],
    documentos: querDoc ? docs.map(paraDoc) : [],
  });
  const impressoes = [
    ...(querCaixa ? caixas.map((c) => ({ tipo: "caixa" as const, id: c.id })) : []),
    ...(querConteudo ? caixas.map((c) => ({ tipo: "conteudo" as const, id: c.id })) : []),
    ...(querDoc ? docs.map((d) => ({ tipo: "documento" as const, id: d.id })) : []),
  ];
  return { pdf, impressoes, total: impressoes.length };
}
