import { MODALIDADES, SITUACOES_CONTRATO } from "./tipos";

// Filtros da pesquisa: vivem na URL (?q=&aba=&de=&ate=...) para voltar,
// recarregar e copiar o link manterem a pesquisa.
export type Aba = "todos" | "licitacao" | "contrato";
export type Filtros = {
  q: string;
  aba: Aba;
  de: number | null;
  ate: number | null;
  modalidade: string | null;
  secretaria: string | null;
  situacao: string | null;
  vmin: number | null;
  vmax: number | null;
  vigencia: "vigentes" | "vencidos" | "vencem_30" | null;
  ordem: "recentes" | "antigos" | "maior_valor";
  cursor: string | null;
};

type Params = Record<string, string | string[] | undefined>;
const um = (p: Params, k: string) => {
  const v = p[k];
  return (Array.isArray(v) ? v[0] : v)?.trim() || null;
};
const inteiro = (v: string | null, min: number, max: number) => {
  const n = v === null ? NaN : Number(v);
  return Number.isInteger(n) && n >= min && n <= max ? n : null;
};
const numero = (v: string | null) => {
  const n = v === null ? NaN : Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
};
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const temFiltroDeContrato = (f: Pick<Filtros, "situacao" | "vmin" | "vmax" | "vigencia">) =>
  f.situacao !== null || f.vmin !== null || f.vmax !== null || f.vigencia !== null;

// Lê e saneia: valor desconhecido vira "sem filtro" (a URL é entrada do usuário).
export function lerFiltros(p: Params): Filtros {
  const aba = um(p, "aba");
  const modalidade = um(p, "modalidade");
  const situacao = um(p, "situacao");
  const vigencia = um(p, "vigencia");
  const secretaria = um(p, "secretaria");
  const ordem = um(p, "ordem");
  const f: Filtros = {
    q: (um(p, "q") ?? "").slice(0, 100),
    aba: aba === "licitacao" || aba === "contrato" ? aba : "todos",
    de: inteiro(um(p, "de"), 1950, 2100),
    ate: inteiro(um(p, "ate"), 1950, 2100),
    modalidade: modalidade && modalidade in MODALIDADES ? modalidade : null,
    secretaria: secretaria && uuid.test(secretaria) ? secretaria : null,
    situacao: situacao && situacao in SITUACOES_CONTRATO ? situacao : null,
    vmin: numero(um(p, "vmin")),
    vmax: numero(um(p, "vmax")),
    vigencia: vigencia === "vigentes" || vigencia === "vencidos" || vigencia === "vencem_30" ? vigencia : null,
    ordem: ordem === "antigos" || ordem === "maior_valor" ? ordem : "recentes",
    cursor: um(p, "cursor"),
  };
  // Filtro de contrato leva a aba para Contratos sozinho.
  if (temFiltroDeContrato(f)) f.aba = "contrato";
  return f;
}

// Caminho de volta: só o que difere do padrão entra na URL.
export function paraQuery(f: Partial<Filtros>) {
  const q = new URLSearchParams();
  const poe = (k: string, v: string | number | null | undefined) => {
    if (v !== null && v !== undefined && v !== "") q.set(k, String(v));
  };
  poe("q", f.q);
  if (f.aba && f.aba !== "todos") poe("aba", f.aba);
  poe("de", f.de);
  poe("ate", f.ate);
  poe("modalidade", f.modalidade);
  poe("secretaria", f.secretaria);
  poe("situacao", f.situacao);
  poe("vmin", f.vmin);
  poe("vmax", f.vmax);
  poe("vigencia", f.vigencia);
  if (f.ordem && f.ordem !== "recentes") poe("ordem", f.ordem);
  poe("cursor", f.cursor);
  return q.toString();
}

// Quantos filtros (fora a busca e a aba) estão ligados, para o "Limpar".
export function filtrosAtivos(f: Filtros) {
  return [f.de, f.ate, f.modalidade, f.secretaria, f.situacao, f.vmin, f.vmax, f.vigencia].filter((v) => v !== null).length;
}
