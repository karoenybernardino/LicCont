import { MODALIDADES, SITUACOES } from "@/features/documentos/tipos";

// Campos que a planilha pode preencher e como reconhecer o título da coluna.
export const CAMPOS = [
  { chave: "tipo", rotulo: "Tipo (licitação ou contrato)", obrigatorio: true, apelidos: ["tipo", "tipo do documento", "tipo de processo"] },
  { chave: "numero", rotulo: "Número do processo", obrigatorio: true, apelidos: ["numero", "número", "n", "nº", "processo", "numero do processo", "número do processo"] },
  { chave: "ano", rotulo: "Ano", obrigatorio: true, apelidos: ["ano", "exercicio", "exercício"] },
  { chave: "objeto", rotulo: "Objeto", obrigatorio: true, apelidos: ["objeto", "descricao", "descrição", "assunto"] },
  { chave: "secretaria", rotulo: "Secretaria", obrigatorio: true, apelidos: ["secretaria", "orgao", "órgão", "setor", "unidade"] },
  { chave: "situacao", rotulo: "Situação", obrigatorio: true, apelidos: ["situacao", "situação", "status"] },
  { chave: "modalidade", rotulo: "Modalidade", obrigatorio: false, apelidos: ["modalidade"] },
  { chave: "empresa", rotulo: "Empresa ou credor", obrigatorio: false, apelidos: ["empresa", "credor", "contratada", "fornecedor", "vencedor"] },
  { chave: "cnpj", rotulo: "CNPJ ou CPF", obrigatorio: false, apelidos: ["cnpj", "cnpj/cpf", "cnpj ou cpf", "documento do credor"] },
  { chave: "valor", rotulo: "Valor", obrigatorio: false, apelidos: ["valor", "valor total", "valor global"] },
  { chave: "vigencia_inicio", rotulo: "Início da vigência", obrigatorio: false, apelidos: ["inicio da vigencia", "início da vigência", "vigencia inicio", "data inicio", "início"] },
  { chave: "vigencia_fim", rotulo: "Fim da vigência", obrigatorio: false, apelidos: ["fim da vigencia", "fim da vigência", "vigencia fim", "data fim", "término", "termino"] },
  { chave: "classe", rotulo: "Classe (código ou nome)", obrigatorio: false, apelidos: ["classe", "codigo de classificacao", "código de classificação", "classificacao", "classificação", "cod. classe"] },
  { chave: "tipologia", rotulo: "Tipologia documental", obrigatorio: false, apelidos: ["tipologia", "tipologia documental"] },
  { chave: "volume", rotulo: "Volume", obrigatorio: false, apelidos: ["volume", "vol", "vol."] },
  { chave: "data_producao", rotulo: "Data do documento", obrigatorio: false, apelidos: ["data", "data do documento", "data do ato", "data de producao", "data de produção"] },
] as const;

export type ChaveCampo = (typeof CAMPOS)[number]["chave"];
// Índice da coluna da planilha para cada campo (ou ausente).
export type Mapa = Partial<Record<ChaveCampo, number>>;

export const semAcento = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

// Sugere o casamento pelo título; cada coluna serve a um campo só.
export function sugerirMapa(cabecalhos: string[]): Mapa {
  const mapa: Mapa = {};
  const usadas = new Set<number>();
  for (const campo of CAMPOS) {
    const alvo = new Set<string>(campo.apelidos.map(semAcento));
    const i = cabecalhos.findIndex((c, idx) => !usadas.has(idx) && alvo.has(semAcento(c)));
    if (i >= 0) {
      mapa[campo.chave] = i;
      usadas.add(i);
    }
  }
  return mapa;
}

// Campos obrigatórios sem coluna escolhida.
export function faltando(mapa: Mapa): string[] {
  return CAMPOS.filter((c) => c.obrigatorio && mapa[c.chave] === undefined).map((c) => c.rotulo);
}

// Mapa vindo do navegador: só índices inteiros dentro da planilha, sem repetir coluna.
export function mapaSeguro(bruto: unknown, totalColunas: number): Mapa | null {
  if (typeof bruto !== "object" || bruto === null) return null;
  const mapa: Mapa = {};
  const usadas = new Set<number>();
  for (const campo of CAMPOS) {
    const v = (bruto as Record<string, unknown>)[campo.chave];
    if (v === undefined || v === null || v === "") continue;
    if (typeof v !== "number" || !Number.isInteger(v) || v < 0 || v >= totalColunas || usadas.has(v)) return null;
    mapa[campo.chave] = v;
    usadas.add(v);
  }
  return mapa;
}

export const TIPO_POR_TEXTO: Record<string, "licitacao" | "contrato"> = {
  licitacao: "licitacao",
  licitacoes: "licitacao",
  contrato: "contrato",
  contratos: "contrato",
};

export const MODALIDADE_POR_TEXTO: Record<string, string> = Object.fromEntries([
  ...Object.entries(MODALIDADES).map(([k, v]) => [semAcento(v), k]),
  ...Object.keys(MODALIDADES).map((k) => [k.replace(/_/g, " "), k]),
]);

export const SITUACAO_POR_TEXTO: Record<string, string> = Object.fromEntries([
  ...Object.entries(SITUACOES).map(([k, v]) => [semAcento(v), k]),
  ...Object.keys(SITUACOES).map((k) => [k.replace(/_/g, " "), k]),
  ["finalizada", "concluida"],
  ["finalizado", "concluida"],
  ["ativo", "vigente"],
  ["ativa", "vigente"],
]);
