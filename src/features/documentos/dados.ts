import "server-only";
import { cache } from "react";
import { clienteSessao } from "@/lib/supabase/servidor";
import { secretariasPermitidas, type Usuario } from "@/features/sessao/dal";
import { SECRETARIAS_DEMO, VINCULOS_DEMO, emDemo } from "@/features/demo/dados";
import { perfilDemo } from "@/features/demo/sessao";
import { CAPACIDADE_CAIXA_DEMO, DOCUMENTOS_DEMO, caixaDemo, idCaixaDemo } from "@/features/demo/documentos";
import { ESTRUTURA_DEMO } from "@/features/demo/estrutura";
import { carregarEstrutura } from "@/features/estrutura/dados";
import { resumir } from "@/features/estrutura/ocupacao";
import { aplicarFiltros } from "./aplicar";
import type { Filtros } from "./filtros";
import type { DocumentoSemPdf } from "./lote";
import { tituloDocumento } from "./titulo";
import type { Modalidade, ResultadoPesquisa, Tipo } from "./tipos";

// Leitura pela sessão do usuário: o RLS devolve só a prefeitura e as
// secretarias permitidas. Demonstração: dados fictícios em memória.

export type Posicao = { texto: string; codigo: string; rua: string; modulo: number; nivel: number; caixa: number };
export type ArquivoDoc = {
  id: string;
  nome: string;
  paginas: number | null;
  tamanho: number;
  situacao: "enviando" | "conferindo" | "pronto" | "recusado";
  avisos: string[];
  motivo: string | null;
  miniatura: boolean;
  sha256: string | null;
};
export type DocumentoDetalhe = {
  id: string;
  tipo: Tipo;
  modalidade: Modalidade | null;
  numero: string;
  ano: number;
  objeto: string;
  empresa: string | null;
  cnpj: string | null;
  // CPF do credor pessoa física (só para o formulário de edição; nunca em lista, busca ou log).
  cpf_credor: string | null;
  valor: number | null;
  situacao: string;
  vigencia_inicio: string | null;
  vigencia_fim: string | null;
  encerrado_em: string | null;
  conferido: boolean;
  origem?: "manual" | "planilha" | "tce";
  ativo: boolean;
  secretariaId: string;
  secretaria: string;
  caixaId: string;
  posicao: Posicao | null;
  arquivo: ArquivoDoc | null;
};

const VAZIO: ResultadoPesquisa = { contagens: { todos: 0, licitacao: 0, contrato: 0 }, total: 0, itens: [], proximo: null };
export const FALHA = "Não foi possível ler os documentos.";

function posicaoDe(rua: string, modulo: number, nivel: number, caixa: number): Posicao {
  const c = String(caixa).padStart(2, "0");
  return {
    rua, modulo, nivel, caixa,
    codigo: `${rua}-M${modulo}-N${nivel}-C${c}`,
    texto: `Rua ${rua} · Módulo ${modulo} · Nível ${nivel} · Caixa ${c}`,
  };
}

export async function pesquisar(u: Usuario, f: Filtros): Promise<ResultadoPesquisa> {
  if (emDemo()) {
    const permitidas = new Set(u.administrador ? SECRETARIAS_DEMO.map((s) => s.id) : VINCULOS_DEMO);
    return aplicarFiltros(DOCUMENTOS_DEMO.filter((d) => permitidas.has(d.secretaria_id)), f);
  }
  const sb = await clienteSessao();
  if (!sb) return VAZIO;
  // O cursor do banco é "criado_em|valor|id".
  const [cc, cv, ci] = (f.cursor ?? "").split("|");
  const cursorOk = !!ci && /^[0-9a-f-]{36}$/i.test(ci) && !Number.isNaN(Date.parse(cc)) && (cv === "" || !Number.isNaN(Number(cv)));
  const { data, error } = await sb.rpc("pesquisar_documentos", {
    p_busca: f.q || null,
    p_aba: f.aba,
    p_ano_de: f.de,
    p_ano_ate: f.ate,
    p_modalidade: f.modalidade,
    p_secretaria: f.secretaria,
    p_situacao: f.situacao,
    p_valor_min: f.vmin,
    p_valor_max: f.vmax,
    p_vigencia: f.vigencia,
    p_ordem: f.ordem,
    p_cursor_criado: cursorOk ? cc : null,
    p_cursor_valor: cursorOk && cv ? Number(cv) : null,
    p_cursor_id: cursorOk ? ci : null,
    p_origem: f.origem,
  });
  if (error || !data) throw new Error(FALHA);
  const r = data as ResultadoPesquisa & { total: number | string };
  return { ...r, total: Number(r.total) };
}

export function cursorDoBanco(p: ResultadoPesquisa["proximo"]) {
  return p ? (emDemo() ? p.id : `${p.criado_em}|${p.valor ?? ""}|${p.id}`) : null;
}

export const obterDocumento = cache(async (id: string): Promise<DocumentoDetalhe | null> => {
  if (emDemo()) {
    const d = DOCUMENTOS_DEMO.find((x) => x.id === id);
    if (!d) return null;
    const cx = caixaDemo(d.caixa_id);
    const sec = SECRETARIAS_DEMO.find((s) => s.id === d.secretaria_id)?.nome ?? "";
    return {
      ...d, encerrado_em: null, cpf_credor: null, conferido: d.conferido, ativo: true, secretariaId: d.secretaria_id, secretaria: sec, caixaId: d.caixa_id,
      posicao: cx ? posicaoDe(cx.rua.codigo, cx.modulo.numero, cx.nivel.numero, cx.numero) : null,
      arquivo: d.arquivo
        ? { id: `a-${d.id}`, nome: d.arquivo.nome, paginas: d.arquivo.paginas, tamanho: d.arquivo.tamanho, situacao: "pronto", avisos: [], motivo: null, miniatura: false, sha256: null }
        : null,
    };
  }
  const sb = await clienteSessao();
  if (!sb) return null;
  const { data, error } = await sb
    .from("documentos")
    .select(
      "id, tipo, modalidade, numero, ano, objeto, empresa, cnpj, cpf_credor, valor, situacao, vigencia_inicio, vigencia_fim, encerrado_em, conferido_em, ativo, origem, secretaria_id, caixa_id, secretarias(nome), caixas(numero, niveis(numero, modulos(numero, ruas(codigo)))), arquivos(id, nome_original, tamanho, paginas, situacao, avisos, motivo_recusa, ativo, miniatura_caminho, enviado_em, sha256)",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(FALHA);
  if (!data) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = data as any;
  const cx = d.caixas;
  const arqs = ((d.arquivos ?? []) as { ativo: boolean; enviado_em: string }[]).sort((a, b) => b.enviado_em.localeCompare(a.enviado_em));
  // O ativo; senão o último envio (conferindo, recusado...).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const a = (arqs.find((x) => x.ativo) ?? arqs[0]) as any;
  return {
    id: d.id, tipo: d.tipo, modalidade: d.modalidade, numero: d.numero, ano: d.ano, objeto: d.objeto,
    empresa: d.empresa, cnpj: d.cnpj, cpf_credor: d.cpf_credor ?? null, valor: d.valor === null ? null : Number(d.valor), situacao: d.situacao,
    vigencia_inicio: d.vigencia_inicio, vigencia_fim: d.vigencia_fim, encerrado_em: d.encerrado_em, conferido: !!d.conferido_em, origem: d.origem, ativo: d.ativo,
    secretariaId: d.secretaria_id, secretaria: d.secretarias?.nome ?? "", caixaId: d.caixa_id,
    posicao: cx ? posicaoDe(cx.niveis.modulos.ruas.codigo, cx.niveis.modulos.numero, cx.niveis.numero, cx.numero) : null,
    arquivo: a
      ? {
          id: a.id, nome: a.nome_original, paginas: a.paginas, tamanho: Number(a.tamanho), situacao: a.situacao,
          avisos: a.avisos ?? [], motivo: a.motivo_recusa, miniatura: !!a.miniatura_caminho, sha256: a.sha256 ?? null,
        }
      : null,
  };
});

// Secretarias em que a pessoa cadastra: administrador, todas as ativas;
// os demais, onde são operador ou coordenador.
export const secretariasParaCadastro = cache(async (u: Usuario) => {
  const lista = (await secretariasPermitidas(u)).filter((s): s is { id: string; nome: string } => s.id !== null);
  if (u.administrador) return lista;
  if (emDemo()) return (await perfilDemo()) === "consulta" ? [] : lista;
  const sb = await clienteSessao();
  if (!sb) return [];
  const { data } = await sb.from("vinculos").select("secretaria_id").eq("usuario_id", u.id).in("papel", ["operador", "coordenador"]);
  const ids = new Set((data ?? []).map((v) => v.secretaria_id as string));
  return lista.filter((s) => ids.has(s.id));
});

// Documentos ativos das secretarias em que a pessoa cadastra e que ainda não têm PDF pronto
// (para o envio de vários PDFs de uma vez).
export async function documentosSemPdf(secretarias: string[]): Promise<DocumentoSemPdf[]> {
  if (secretarias.length === 0) return [];
  if (emDemo()) {
    return DOCUMENTOS_DEMO.filter((d) => secretarias.includes(d.secretaria_id) && !d.tem_pdf).map((d) => ({
      id: d.id, titulo: tituloDocumento({ tipo: d.tipo as Tipo, modalidade: d.modalidade as Modalidade | null, numero: d.numero, ano: d.ano }), numero: d.numero, ano: d.ano,
    }));
  }
  const sb = await clienteSessao();
  if (!sb) return [];
  const { data, error } = await sb
    .from("documentos")
    .select("id, tipo, modalidade, numero, ano, arquivos(ativo)")
    .eq("ativo", true)
    .in("secretaria_id", secretarias)
    .order("criado_em", { ascending: false })
    .limit(1000);
  if (error) throw new Error(FALHA);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any[]).filter((d) => !(d.arquivos ?? []).some((a: { ativo: boolean }) => a.ativo)).map((d) => ({ id: d.id, titulo: tituloDocumento(d), numero: d.numero, ano: d.ano }));
}

export async function podeCadastrar(u: Usuario) {
  return (await secretariasParaCadastro(u)).length > 0;
}

// Confere e desativa: administrador ou coordenador da secretaria do documento.
export async function podeConferir(u: Usuario, secretariaId: string) {
  if (u.administrador) return true;
  if (emDemo()) return (await perfilDemo()) === "coordenador" && VINCULOS_DEMO.includes(secretariaId);
  const sb = await clienteSessao();
  if (!sb) return false;
  const { data } = await sb.from("vinculos").select("id").eq("usuario_id", u.id).eq("secretaria_id", secretariaId).eq("papel", "coordenador").limit(1);
  return !!data?.length;
}

export type CaixaOcupada = { id: string; numero: number; documentos: number; capacidade: number };

// Caixas ativas de um nível com a ocupação (só números, de todas as secretarias).
export async function caixasComOcupacao(nivelId: string): Promise<CaixaOcupada[]> {
  if (emDemo()) {
    const nivel = ESTRUTURA_DEMO.niveis.find((n) => n.id === nivelId);
    if (!nivel) return [];
    return Array.from({ length: nivel.caixas }, (_, i) => {
      const id = idCaixaDemo(nivel.id, i + 1);
      return { id, numero: i + 1, documentos: DOCUMENTOS_DEMO.filter((d) => d.caixa_id === id).length, capacidade: CAPACIDADE_CAIXA_DEMO };
    });
  }
  const sb = await clienteSessao();
  if (!sb) return [];
  const { data: caixas } = await sb.from("caixas").select("id, numero").eq("nivel_id", nivelId).eq("ativo", true).order("numero");
  const ids = (caixas ?? []).map((c) => c.id as string);
  if (!ids.length) return [];
  const { data: oc } = await sb.rpc("ocupacao_caixas", { p_caixas: ids });
  const mapa = new Map<string, { documentos: number; capacidade: number }>(
    (oc ?? []).map((o: { caixa_id: string; documentos: number; capacidade: number }) => [o.caixa_id, o]),
  );
  return (caixas ?? []).map((c) => ({
    id: c.id as string,
    numero: c.numero as number,
    documentos: mapa.get(c.id as string)?.documentos ?? 0,
    capacidade: mapa.get(c.id as string)?.capacidade ?? 50,
  }));
}

// Botão "Próxima livre": escopo = nível, módulo ou rua.
export async function proximaCaixaLivre(escopo: { nivel?: string; modulo?: string; rua?: string }) {
  if (emDemo()) {
    const niveis = ESTRUTURA_DEMO.niveis.filter(
      (n) =>
        (!escopo.nivel && !escopo.modulo && !escopo.rua) ||
        n.id === escopo.nivel ||
        n.moduloId === escopo.modulo ||
        ESTRUTURA_DEMO.modulos.find((m) => m.id === n.moduloId)?.ruaId === escopo.rua,
    );
    for (const n of niveis) {
      for (let i = 1; i <= n.caixas; i++) {
        const id = idCaixaDemo(n.id, i);
        if (DOCUMENTOS_DEMO.filter((d) => d.caixa_id === id).length < CAPACIDADE_CAIXA_DEMO) return id;
      }
    }
    return null;
  }
  const sb = await clienteSessao();
  if (!sb) return null;
  const { data } = await sb.rpc("proxima_caixa_livre", {
    p_nivel: escopo.nivel ?? null,
    p_modulo: escopo.modulo ?? null,
    p_rua: escopo.rua ?? null,
  });
  return (data as string | null) ?? null;
}

// Caixa -> posição (para preencher o formulário ao editar).
export async function posicaoDaCaixa(caixaId: string): Promise<{ ruaId: string; moduloId: string; nivelId: string } | null> {
  if (emDemo()) {
    const cx = caixaDemo(caixaId);
    return cx ? { ruaId: cx.rua.id, moduloId: cx.modulo.id, nivelId: cx.nivel.id } : null;
  }
  const sb = await clienteSessao();
  if (!sb) return null;
  const { data } = await sb.from("caixas").select("nivel_id, niveis(modulo_id, modulos(rua_id))").eq("id", caixaId).maybeSingle();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = data as any;
  return d ? { nivelId: d.nivel_id, moduloId: d.niveis.modulo_id, ruaId: d.niveis.modulos.rua_id } : null;
}

// Tamanho máximo do PDF desta prefeitura (MB). Demonstração: 50.
export async function limitePdfMb(u: Usuario) {
  if (emDemo()) return 50;
  const sb = await clienteSessao();
  if (!sb) return 50;
  const { data } = await sb.from("prefeituras").select("limite_pdf_mb").eq("id", u.prefeituraId).maybeSingle();
  return (data?.limite_pdf_mb as number | undefined) ?? 50;
}

// Ruas, módulos e níveis ativos para as listas do cadastro.
export async function opcoesEstrutura() {
  const e = await carregarEstrutura();
  const ruas = e.ruas.filter((r) => r.ativo);
  const modulos = e.modulos.filter((m) => m.ativo && ruas.some((r) => r.id === m.ruaId));
  return {
    ruas: ruas.map((r) => ({
      id: r.id,
      codigo: r.codigo,
      modulos: modulos.filter((m) => m.ruaId === r.id).length,
      percentual: resumir(e, r.id).percentual,
    })),
    modulos: modulos.map((m) => ({ id: m.id, ruaId: m.ruaId, numero: m.numero })).sort((a, b) => a.numero - b.numero),
    niveis: e.niveis
      .filter((n) => n.ativo && modulos.some((m) => m.id === n.moduloId))
      .map((n) => ({ id: n.id, moduloId: n.moduloId, numero: n.numero })),
  };
}
