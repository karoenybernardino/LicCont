import { z } from "zod";
import { cnpjValido } from "@/features/documentos/esquemas";

// Cliente da API de Dados Abertos do TCE-CE (SIM), conferido contra a
// especificação oficial (openapi_prod.yaml) e respostas reais em 15/11/2026.
// Só no servidor, na região de São Paulo (a API só aceita IP do Brasil).
//
// - Endereço: {base}/sim/{método}?codigo_municipio=&data_inicio=AAAAMMDD&data_fim=AAAAMMDD
// - Paginação: $count (máx. 1000) e $start_index.
// - Licitação = /processos_administrativos_contratacoes; contrato = /contratos,
//   com a empresa vinda de /contratados (mesmo número e data do contrato).
// - A API não tem id próprio: a chave é número + data (autuação ou celebração).
// - Os textos chegam com acento quebrado (UTF-8 lido como Windows-1252): consertarTexto.
// - Formato inesperado PARA a rotina e nada é gravado pela metade.

export const BASE_PADRAO = "https://api-dados-abertos.tce.ce.gov.br";
export const CAMINHOS = { licitacao: "/sim/processos_administrativos_contratacoes", contrato: "/sim/contratos" } as const;
const CAMINHO_CONTRATADOS = "/sim/contratados";
export const POR_PAGINA = 1000;
export const MAX_PAGINAS = 200;

export type TipoTce = keyof typeof CAMINHOS;

export class ErroTce extends Error {
  constructor(readonly codigo: "indisponivel" | "formato") {
    super(codigo === "indisponivel" ? "TCE indisponível" : "Formato inesperado do TCE");
    this.name = "ErroTce";
  }
}

export type RegistroTce = {
  tce_id: string;
  tipo: TipoTce;
  modalidade: string | null;
  numero: string;
  ano: number;
  objeto: string;
  empresa: string | null;
  cnpj: string | null;
  valor: number | null;
  situacao: string;
  vigencia_inicio: string | null;
  vigencia_fim: string | null;
};

// Windows-1252: bytes 0x80–0x9F que viram caracteres fora do Latin-1.
const CP1252: Record<string, number> = {
  "€": 0x80, "‚": 0x82, "ƒ": 0x83, "„": 0x84, "…": 0x85, "†": 0x86, "‡": 0x87, "ˆ": 0x88, "‰": 0x89, "Š": 0x8a, "‹": 0x8b, "Œ": 0x8c, "Ž": 0x8e,
  "‘": 0x91, "’": 0x92, "“": 0x93, "”": 0x94, "•": 0x95, "–": 0x96, "—": 0x97, "˜": 0x98, "™": 0x99, "š": 0x9a, "›": 0x9b, "œ": 0x9c, "ž": 0x9e, "Ÿ": 0x9f,
};

// Desfaz o "UTF-8 lido como Windows-1252" (ex.: "CONTRATAÃ‡ÃƒO" vira "CONTRATAÇÃO"),
// par a par. O que não tem volta (byte perdido pela API) fica como veio.
const PAR = new RegExp("[ÃÂ][\u0080-\u00BF" + Object.keys(CP1252).join("") + "]", "g");
export function consertarTexto(t: string): string {
  if (!/[ÃÂ]/.test(t)) return t;
  return t.replace(PAR, (par) => {
    const b = [...par].map((ch) => (ch.codePointAt(0)! < 0x100 ? ch.codePointAt(0)! : CP1252[ch]));
    try {
      return new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(b));
    } catch {
      return par;
    }
  });
}

const str = z
  .union([z.string(), z.number(), z.null()])
  .optional()
  .transform((v) => (v === null || v === undefined ? "" : consertarTexto(String(v)).trim()));
const dinheiro = z.union([z.number(), z.string(), z.null()]).optional();

const licitacao = z
  .object({
    numero_licitacao: str,
    data_realizacao_autuacao_licitacao: str,
    modalidade_licitacao: str,
    modalidade_processo_administrativo: str,
    descricao_objeto_licitacao: str,
    data_homologacao: str,
  })
  .loose();
const contrato = z
  .object({
    numero_contrato: str,
    data_contrato: str,
    descricao_objeto_contrato: str,
    valor_total_contrato: dinheiro,
    data_inicio_vigencia_contrato: str,
    data_fim_vigencia_contrato: str,
  })
  .loose();
const contratado = z
  .object({ numero_contrato: str, data_contrato: str, numero_documento_negociante: str, nome_negociante: str })
  .loose();

function dataIso(t: string): string | null {
  const m = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}
const hoje = () => new Date().toISOString().slice(0, 10);

// Empresa por contrato: nome e CNPJ (CPF nunca é guardado; só o nome).
export type Contratados = Map<string, { empresa: string | null; cnpj: string | null }>;
export const chaveContrato = (numero: string, data: string) => `${numero}|${data.slice(0, 10)}`;

export type Normalizado = { registro: RegistroTce } | { ignorado: true };

// Registro sem número, data ou objeto é formato inesperado (para tudo).
// Licitação de modalidade que o LicCONT não consegue deduzir com segurança é só
// ignorada e contada.
export function normalizar(bruto: unknown, tipo: TipoTce, contratados: Contratados = new Map()): Normalizado {
  if (tipo === "licitacao") {
    const r = licitacao.safeParse(bruto);
    if (!r.success) throw new ErroTce("formato");
    const i = r.data;
    const data = dataIso(i.data_realizacao_autuacao_licitacao);
    const objeto = i.descricao_objeto_licitacao;
    if (!i.numero_licitacao || !data || !objeto) throw new ErroTce("formato");
    // Dispensa (D) e inexigibilidade (I) vêm da espécie do processo; pregão
    // eletrônico é o código 6 (confere com o sufixo "-PE" dos números reais).
    // Os demais códigos não são documentados: ficam de fora até serem confirmados.
    const modalidade =
      i.modalidade_processo_administrativo === "D"
        ? "dispensa"
        : i.modalidade_processo_administrativo === "I"
          ? "inexigibilidade"
          : i.modalidade_licitacao === "6"
            ? "pregao_eletronico"
            : null;
    if (!modalidade) return { ignorado: true };
    return {
      registro: {
        tce_id: `L|${i.numero_licitacao}|${data}`.slice(0, 80),
        tipo,
        modalidade,
        numero: i.numero_licitacao.slice(0, 30),
        ano: Number(data.slice(0, 4)),
        objeto: objeto.slice(0, 2000),
        empresa: null,
        cnpj: null,
        valor: null,
        situacao: dataIso(i.data_homologacao) ? "concluida" : "em_andamento",
        vigencia_inicio: null,
        vigencia_fim: null,
      },
    };
  }
  const r = contrato.safeParse(bruto);
  if (!r.success) throw new ErroTce("formato");
  const i = r.data;
  const data = dataIso(i.data_contrato);
  const objeto = i.descricao_objeto_contrato;
  if (!i.numero_contrato || !data || !objeto) throw new ErroTce("formato");
  const v = i.valor_total_contrato;
  const valor = v === null || v === undefined || v === "" ? null : Number(v);
  const fim = dataIso(i.data_fim_vigencia_contrato);
  const c = contratados.get(chaveContrato(i.numero_contrato, data));
  return {
    registro: {
      tce_id: `C|${i.numero_contrato}|${data}`.slice(0, 80),
      tipo,
      modalidade: null,
      numero: i.numero_contrato.slice(0, 30),
      ano: Number(data.slice(0, 4)),
      objeto: objeto.slice(0, 2000),
      empresa: c?.empresa ?? null,
      cnpj: c?.cnpj ?? null,
      valor: valor !== null && Number.isFinite(valor) && valor >= 0 ? valor : null,
      situacao: fim && fim < hoje() ? "encerrado" : "vigente",
      vigencia_inicio: dataIso(i.data_inicio_vigencia_contrato),
      vigencia_fim: fim,
    },
  };
}

export function indexarContratados(itens: unknown[]): Contratados {
  const mapa: Contratados = new Map();
  for (const bruto of itens) {
    const r = contratado.safeParse(bruto);
    if (!r.success) throw new ErroTce("formato");
    const c = r.data;
    const data = dataIso(c.data_contrato);
    if (!c.numero_contrato || !data) continue;
    const doc = c.numero_documento_negociante.replace(/\D/g, "");
    mapa.set(chaveContrato(c.numero_contrato, data), {
      empresa: c.nome_negociante.slice(0, 200) || null,
      cnpj: doc.length === 14 && cnpjValido(doc) ? doc : null,
    });
  }
  return mapa;
}

const pagina = z.object({ elements: z.array(z.unknown()) });

export type Dependencias = {
  buscar?: typeof fetch;
  esperar?: (ms: number) => Promise<void>;
  base?: string;
  tentativas?: number;
};

const dormir = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
type Ferramentas = Required<Pick<Dependencias, "buscar" | "esperar" | "tentativas">>;

async function buscarPagina(url: string, d: Ferramentas): Promise<unknown[]> {
  for (let t = 1; ; t++) {
    try {
      const resp = await d.buscar(url, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(30_000) });
      if (resp.status >= 500 || resp.status === 429) throw new ErroTce("indisponivel");
      // A API responde 200 com "__errors__" quando a consulta é recusada.
      const bruto = await resp.json();
      if (!resp.ok) throw new ErroTce("formato");
      const corpo = pagina.safeParse(bruto);
      if (!corpo.success) throw new ErroTce("formato");
      return corpo.data.elements;
    } catch (e) {
      if (e instanceof ErroTce && e.codigo === "formato") throw e;
      if (t >= d.tentativas) throw new ErroTce("indisponivel");
      await d.esperar(1000 * 2 ** (t - 1));
    }
  }
}

// Lê todas as páginas de um método, uma de cada vez, com pausa entre elas.
async function lerPaginas(
  caminho: string,
  municipio: string,
  ano: number,
  base: string,
  d: Ferramentas,
  aoPagina: (itens: unknown[]) => Promise<void>,
) {
  for (let p = 0; p < MAX_PAGINAS; p++) {
    const url = `${base}${caminho}?codigo_municipio=${municipio}&data_inicio=${ano}0101&data_fim=${ano}1231&%24count=${POR_PAGINA}&%24start_index=${p * POR_PAGINA}`;
    const itens = await buscarPagina(url, d);
    await aoPagina(itens);
    if (itens.length < POR_PAGINA) return;
    await d.esperar(500);
  }
}

export type Lido = { registros: RegistroTce[]; ignorados: number };

// Lê um tipo e ano. Erro de formato em qualquer página interrompe tudo.
export async function lerTce(
  tipo: TipoTce,
  municipio: string,
  ano: number,
  dep: Dependencias = {},
  aoPagina?: (registros: RegistroTce[]) => Promise<void>,
): Promise<Lido> {
  const d: Ferramentas = { buscar: dep.buscar ?? fetch, esperar: dep.esperar ?? dormir, tentativas: dep.tentativas ?? 3 };
  const base = dep.base ?? process.env.TCE_API_BASE ?? BASE_PADRAO;
  if (!/^\d{1,10}$/.test(municipio) || !Number.isInteger(ano) || ano < 1950 || ano > 2100) throw new ErroTce("formato");

  let contratados: Contratados = new Map();
  if (tipo === "contrato") {
    const todos: unknown[] = [];
    await lerPaginas(CAMINHO_CONTRATADOS, municipio, ano, base, d, async (itens) => void todos.push(...itens));
    contratados = indexarContratados(todos);
  }

  const todos: RegistroTce[] = [];
  let ignorados = 0;
  await lerPaginas(CAMINHOS[tipo], municipio, ano, base, d, async (itens) => {
    const daPagina: RegistroTce[] = [];
    for (const bruto of itens) {
      const n = normalizar(bruto, tipo, contratados);
      if ("registro" in n) daPagina.push(n.registro);
      else ignorados++;
    }
    if (aoPagina) await aoPagina(daPagina);
    else todos.push(...daPagina);
  });
  return { registros: todos, ignorados };
}
