import { z } from "zod";
import { cnpjValido } from "@/features/documentos/esquemas";
import { MODALIDADE_POR_TEXTO, SITUACAO_POR_TEXTO, semAcento } from "@/features/importacao/colunas";

// Cliente da API de Dados Abertos do TCE-CE (SIM). Só no servidor, na região
// de São Paulo (a API só aceita IP do Brasil).
//
// ATENÇÃO: os caminhos e os nomes dos campos abaixo são os que o plano assume.
// Confirme contra a resposta real antes de ligar `tce_ativo` em produção; tudo
// que muda está neste arquivo. Formato inesperado PARA a rotina e nada é
// gravado pela metade.

export const BASE_PADRAO = "https://api-dados-abertos.tce.ce.gov.br";
export const CAMINHOS = { licitacao: "/licitacoes", contrato: "/contratos" } as const;
export const POR_PAGINA = 200;
export const MAX_PAGINAS = 500;

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

const texto = z.union([z.string(), z.number()]).transform((v) => String(v).trim());
const opcional = z.union([z.string(), z.number(), z.null()]).optional().transform((v) => (v === null || v === undefined ? "" : String(v).trim()));

// Aceita o item cru e devolve só o que o LicCONT guarda. CPF nunca passa.
const item = z
  .object({
    id: texto.optional(),
    codigo: texto.optional(),
    numero: texto.optional(),
    numero_licitacao: texto.optional(),
    numero_contrato: texto.optional(),
    ano: z.coerce.number().int().optional(),
    exercicio: z.coerce.number().int().optional(),
    objeto: opcional,
    descricao: opcional,
    modalidade: opcional,
    situacao: opcional,
    nome_fornecedor: opcional,
    nome_contratado: opcional,
    cnpj: opcional,
    cpf_cnpj: opcional,
    valor: z.union([z.number(), z.string(), z.null()]).optional(),
    valor_global: z.union([z.number(), z.string(), z.null()]).optional(),
    data_inicio_vigencia: opcional,
    data_fim_vigencia: opcional,
  })
  .loose();

function dataIso(t: string): string | null {
  const m = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  const b = t.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  return b ? `${b[3]}-${b[2]}-${b[1]}` : null;
}

export type Normalizado = { registro: RegistroTce } | { ignorado: true };

// Registro sem id, número ou ano é formato inesperado (para tudo). Registro
// completo mas com modalidade ou situação que o LicCONT não conhece é só
// ignorado e contado.
export function normalizar(bruto: unknown, tipo: TipoTce): Normalizado {
  const r = item.safeParse(bruto);
  if (!r.success) throw new ErroTce("formato");
  const i = r.data;
  const tceId = i.id ?? i.codigo;
  const numero = i.numero ?? (tipo === "licitacao" ? i.numero_licitacao : i.numero_contrato);
  const ano = i.ano ?? i.exercicio;
  const objeto = i.objeto || i.descricao;
  if (!tceId || !numero || !ano || ano < 1950 || ano > 2100 || !objeto) throw new ErroTce("formato");

  const modalidade = i.modalidade ? (MODALIDADE_POR_TEXTO[semAcento(i.modalidade)] ?? null) : null;
  if (tipo === "licitacao" && !modalidade) return { ignorado: true };
  const situacao = SITUACAO_POR_TEXTO[semAcento(i.situacao)] ?? (tipo === "contrato" ? "vigente" : null);
  if (!situacao) return { ignorado: true };

  // Só CNPJ válido (14 dígitos). Se vier CPF, o número é descartado.
  const doc = (i.cnpj || i.cpf_cnpj).replace(/\D/g, "");
  const cnpj = doc.length === 14 && cnpjValido(doc) ? doc : null;
  const bruto_valor = i.valor ?? i.valor_global;
  const valor = bruto_valor === null || bruto_valor === undefined || bruto_valor === "" ? null : Number(bruto_valor);

  return {
    registro: {
      tce_id: `${tipo === "licitacao" ? "L" : "C"}${tceId}`.slice(0, 80),
      tipo,
      modalidade: tipo === "licitacao" ? modalidade : null,
      numero: numero.slice(0, 30),
      ano,
      objeto: objeto.slice(0, 2000),
      empresa: (i.nome_fornecedor || i.nome_contratado).slice(0, 200) || null,
      cnpj,
      valor: valor !== null && Number.isFinite(valor) && valor >= 0 ? valor : null,
      situacao,
      vigencia_inicio: tipo === "contrato" ? dataIso(i.data_inicio_vigencia) : null,
      vigencia_fim: tipo === "contrato" ? dataIso(i.data_fim_vigencia) : null,
    },
  };
}

const pagina = z.union([z.array(z.unknown()), z.object({ data: z.array(z.unknown()) }).transform((o) => o.data), z.object({ dados: z.array(z.unknown()) }).transform((o) => o.dados)]);

export type Dependencias = {
  buscar?: typeof fetch;
  esperar?: (ms: number) => Promise<void>;
  base?: string;
  tentativas?: number;
};

const dormir = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function buscarPagina(url: string, d: Required<Pick<Dependencias, "buscar" | "esperar" | "tentativas">>): Promise<unknown[]> {
  for (let t = 1; ; t++) {
    try {
      const resp = await d.buscar(url, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(30_000) });
      if (resp.status >= 500 || resp.status === 429) throw new ErroTce("indisponivel");
      if (!resp.ok) throw new ErroTce("formato");
      const corpo = pagina.safeParse(await resp.json());
      if (!corpo.success) throw new ErroTce("formato");
      return corpo.data;
    } catch (e) {
      if (e instanceof ErroTce && e.codigo === "formato") throw e;
      if (t >= d.tentativas) throw new ErroTce("indisponivel");
      await d.esperar(1000 * 2 ** (t - 1));
    }
  }
}

export type Lido = { registros: RegistroTce[]; ignorados: number };

// Lê todas as páginas de um tipo e ano, uma de cada vez, com pausa entre elas.
// Erro de formato em qualquer página interrompe tudo (nada parcial é devolvido).
export async function lerTce(
  tipo: TipoTce,
  municipio: string,
  ano: number,
  dep: Dependencias = {},
  aoPagina?: (registros: RegistroTce[]) => Promise<void>,
): Promise<Lido> {
  const d = { buscar: dep.buscar ?? fetch, esperar: dep.esperar ?? dormir, tentativas: dep.tentativas ?? 3 };
  const base = dep.base ?? process.env.TCE_API_BASE ?? BASE_PADRAO;
  if (!/^\d{1,10}$/.test(municipio) || !Number.isInteger(ano)) throw new ErroTce("formato");
  const todos: RegistroTce[] = [];
  let ignorados = 0;
  for (let p = 1; p <= MAX_PAGINAS; p++) {
    const url = `${base}${CAMINHOS[tipo]}?codigo_municipio=${municipio}&exercicio_orcamento=${ano}&pagina=${p}&quantidade=${POR_PAGINA}`;
    const itens = await buscarPagina(url, d);
    const daPagina: RegistroTce[] = [];
    for (const bruto of itens) {
      const n = normalizar(bruto, tipo);
      if ("registro" in n) daPagina.push(n.registro);
      else ignorados++;
    }
    if (aoPagina) await aoPagina(daPagina);
    else todos.push(...daPagina);
    if (itens.length < POR_PAGINA) break;
    await d.esperar(500);
  }
  return { registros: todos, ignorados };
}
