import { MODALIDADES, ORGAOS, type Orgao } from "./tipos";

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
  origem: "manual" | "planilha" | "tce" | null;
  orgao: Orgao | null;
  // Fundo e setor da caixa (parte do nome, sem acento); mês de 1 a 12 entre os meses da caixa.
  fundo: string | null;
  setor: string | null;
  mes: number | null;
  ordem: "recentes" | "antigos";
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
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Lê e saneia: valor desconhecido vira "sem filtro" (a URL é entrada do usuário).
export function lerFiltros(p: Params): Filtros {
  const aba = um(p, "aba");
  const modalidade = um(p, "modalidade");
  const orgao = um(p, "orgao");
  const secretaria = um(p, "secretaria");
  const ordem = um(p, "ordem");
  const f: Filtros = {
    q: (um(p, "q") ?? "").slice(0, 100),
    aba: aba === "licitacao" || aba === "contrato" ? aba : "todos",
    de: inteiro(um(p, "de"), 1950, 2100),
    ate: inteiro(um(p, "ate"), 1950, 2100),
    modalidade: modalidade && modalidade in MODALIDADES ? modalidade : null,
    secretaria: secretaria && uuid.test(secretaria) ? secretaria : null,
    origem: um(p, "origem") === "manual" || um(p, "origem") === "planilha" || um(p, "origem") === "tce" ? (um(p, "origem") as Filtros["origem"]) : null,
    orgao: orgao && orgao in ORGAOS ? (orgao as Orgao) : null,
    fundo: um(p, "fundo")?.slice(0, 120) ?? null,
    setor: um(p, "setor")?.slice(0, 120) ?? null,
    mes: inteiro(um(p, "mes"), 1, 12),
    ordem: ordem === "antigos" ? "antigos" : "recentes",
    cursor: um(p, "cursor"),
  };
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
  poe("origem", f.origem);
  poe("orgao", f.orgao);
  poe("fundo", f.fundo);
  poe("setor", f.setor);
  poe("mes", f.mes);
  if (f.ordem && f.ordem !== "recentes") poe("ordem", f.ordem);
  poe("cursor", f.cursor);
  return q.toString();
}

// Quantos filtros (fora a busca e a aba) estão ligados, para o "Limpar".
export function filtrosAtivos(f: Filtros) {
  return [f.de, f.ate, f.modalidade, f.secretaria, f.origem, f.orgao, f.fundo, f.setor, f.mes].filter((v) => v !== null).length;
}
