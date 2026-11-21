// Tabela de temporalidade por planilha (.xlsx, .csv) ou PDF: regras puras, sem banco.
// A leitura do arquivo devolve texto (cabeçalhos + linhas); aqui o texto vira linhas de classe
// com os erros apontados, para a conferência obrigatória na prévia antes de salvar.
import { strToU8, zipSync } from "fflate";
import type { Destinacao, TipoPrazo } from "./regras";

export type LinhaClasse = {
  codigo: string;
  nome: string;
  grupo: string;
  tipologias: string;
  corrente: number;
  intermediaria: number;
  tipoPrazo: TipoPrazo;
  destinacao: Destinacao;
  observacao: string;
  // Leitura de PDF duvidosa (texto sem coluna clara ou OCR pouco confiável): a pessoa confere.
  duvida?: boolean;
};

export const COLUNAS_MODELO = ["Código", "Classe", "Grupo", "Tipologias", "Prazo (anos)", "Tipo de prazo", "Destinação", "Observação"] as const;

const semAcento = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

const APELIDOS: Record<string, string[]> = {
  codigo: ["codigo", "cod", "codigo de classificacao", "classificacao"],
  nome: ["classe", "nome", "descricao", "assunto", "tipo documental", "especie documental"],
  grupo: ["grupo", "grupo documental", "funcao", "area"],
  tipologias: ["tipologias", "tipologia", "tipologia documental"],
  prazo: ["prazo", "prazo de guarda", "prazo (anos)", "prazo em anos", "guarda"],
  tipoPrazo: ["tipo de prazo", "tipo prazo", "contagem"],
  destinacao: ["destinacao", "destinacao final"],
  observacao: ["observacao", "observacoes", "obs"],
};

export function mapearColunas(cabecalhos: string[]): Partial<Record<keyof typeof APELIDOS, number>> {
  const mapa: Partial<Record<keyof typeof APELIDOS, number>> = {};
  cabecalhos.forEach((c, i) => {
    const t = semAcento(c);
    for (const [campo, nomes] of Object.entries(APELIDOS)) {
      if (!(campo in mapa) && nomes.includes(t)) mapa[campo as keyof typeof APELIDOS] = i;
    }
  });
  return mapa;
}

// Só há prazo fixo (conta do fim do ano do documento) ou guarda permanente; tabela antiga com "após evento" lê como fixo.
function lerTipoPrazo(texto: string, prazo: string): TipoPrazo {
  return semAcento(texto).includes("perman") || semAcento(prazo).includes("perman") ? "permanente" : "fixo";
}

function lerDestinacao(texto: string, tipo: TipoPrazo): Destinacao {
  const t = semAcento(texto);
  if (t.includes("perman")) return "guarda_permanente";
  if (t.includes("elimin")) return "eliminacao";
  return tipo === "permanente" ? "guarda_permanente" : "eliminacao";
}

// "12", "12 anos", "5 + 7" (corrente + intermediária). Sem número: 0.
function lerPrazo(texto: string): { corrente: number; intermediaria: number } {
  const n = semAcento(texto).match(/\d+/g)?.map(Number) ?? [];
  if (/\d\s*\+\s*\d/.test(texto) && n.length >= 2) return { corrente: n[0], intermediaria: n[1] };
  return { corrente: n[0] ?? 0, intermediaria: 0 };
}

export type ResultadoLeitura = { linhas: LinhaClasse[]; semColunas: string[] };

// Cabeçalhos e linhas de texto -> linhas de classe. Falta de coluna obrigatória (código, classe, grupo)
// devolve a lista em `semColunas` e nenhuma linha.
export function montarLinhas(cabecalhos: string[], linhas: string[][], grupoPadrao = ""): ResultadoLeitura {
  const m = mapearColunas(cabecalhos);
  const falta = (["codigo", "nome"] as const).filter((c) => m[c] === undefined);
  if (falta.length) return { linhas: [], semColunas: falta.map((c) => (c === "codigo" ? "Código" : "Classe")) };
  const c = (l: string[], campo: keyof typeof APELIDOS) => (m[campo] === undefined ? "" : (l[m[campo] as number] ?? "").trim());
  const out: LinhaClasse[] = [];
  for (const l of linhas) {
    if (l.every((x) => !x.trim())) continue;
    const prazoTxt = c(l, "prazo");
    const tipoPrazo = lerTipoPrazo(c(l, "tipoPrazo"), prazoTxt);
    out.push({
      codigo: c(l, "codigo"),
      nome: c(l, "nome"),
      grupo: c(l, "grupo") || grupoPadrao,
      tipologias: c(l, "tipologias"),
      ...lerPrazo(prazoTxt),
      tipoPrazo,
      destinacao: lerDestinacao(c(l, "destinacao"), tipoPrazo),
      observacao: c(l, "observacao"),
    });
  }
  return { linhas: out, semColunas: [] };
}

// Erros de cada linha (mesma ordem). Texto fixo, sem conteúdo da célula.
export function conferirLinhas(linhas: LinhaClasse[], gruposDoOrgao: string[]): string[][] {
  const grupos = new Set(gruposDoOrgao.map(semAcento));
  const vistos = new Map<string, number>();
  linhas.forEach((l) => vistos.set(l.codigo.trim(), (vistos.get(l.codigo.trim()) ?? 0) + 1));
  return linhas.map((l) => {
    const e: string[] = [];
    if (!l.codigo.trim()) e.push("Falta o código.");
    else if (!/^[0-9A-Za-z.-]{1,20}$/.test(l.codigo.trim())) e.push("Código inválido (use letras, números, ponto ou traço, até 20).");
    else if ((vistos.get(l.codigo.trim()) ?? 0) > 1) e.push("Código repetido na tabela.");
    if (l.nome.trim().length < 2) e.push("Falta o nome da classe.");
    if (!l.grupo.trim()) e.push("Falta o grupo.");
    else if (!grupos.has(semAcento(l.grupo))) e.push("Grupo não cadastrado neste órgão.");
    if (l.tipoPrazo !== "permanente" && (l.corrente + l.intermediaria < 1 || l.corrente > 99 || l.intermediaria > 99)) e.push("Prazo inválido (de 1 a 99 anos).");
    if ((l.tipoPrazo === "permanente") !== (l.destinacao === "guarda_permanente")) e.push("Guarda permanente e prazo permanente têm de andar juntos.");
    return e;
  });
}

// Corpo para a função classes_salvar do banco.
export const paraBanco = (linhas: LinhaClasse[]) =>
  linhas.map((l) => ({
    codigo: l.codigo.trim(),
    nome: l.nome.trim(),
    grupo: l.grupo.trim(),
    tipologias: l.tipologias.trim(),
    prazo_corrente: l.tipoPrazo === "permanente" ? 0 : l.corrente,
    prazo_intermediaria: l.tipoPrazo === "permanente" ? 0 : l.intermediaria,
    tipo_prazo: l.tipoPrazo,
    destinacao: l.destinacao,
    observacao: l.observacao.trim(),
  }));

// Texto curto da coluna "Prazo" da lista.
export function textoPrazo(r: { corrente: number; intermediaria: number; tipoPrazo: TipoPrazo }) {
  if (r.tipoPrazo === "permanente") return "Permanente";
  const n = r.corrente + r.intermediaria;
  return `${n} ${n === 1 ? "ano" : "anos"}`;
}

// Frase do prazo de guarda que sai na etiqueta: "5 anos a partir do fim do ano do documento".
export function prazoDeGuarda(r: { corrente: number; intermediaria: number; tipoPrazo: TipoPrazo }) {
  if (r.tipoPrazo === "permanente") return "Guarda permanente";
  const n = r.corrente + r.intermediaria;
  return `${n} ${n === 1 ? "ano" : "anos"} a partir do fim do ano do documento`;
}

// ---------------------------------------------------------------------------
// Texto do PDF -> linhas de tabela
// ---------------------------------------------------------------------------
export type ItemTexto = { texto: string; x: number; y: number; largura: number; confianca?: number };

// Junta os trechos da mesma altura em linhas e separa as colunas pelos vãos grandes entre trechos.
export function linhasDeItens(itens: ItemTexto[]): { celulas: string[]; confianca: number }[] {
  const lista = itens.filter((i) => i.texto.trim());
  lista.sort((a, b) => b.y - a.y || a.x - b.x);
  const linhas: ItemTexto[][] = [];
  for (const i of lista) {
    const ultima = linhas[linhas.length - 1];
    if (ultima && Math.abs(ultima[0].y - i.y) <= 3) ultima.push(i);
    else linhas.push([i]);
  }
  return linhas.map((l) => {
    l.sort((a, b) => a.x - b.x);
    const celulas: string[] = [];
    let atual = "";
    let fim = 0;
    for (const i of l) {
      const vao = i.x - fim;
      if (atual && vao > 10) {
        celulas.push(atual.trim());
        atual = i.texto;
      } else atual += (atual ? " " : "") + i.texto;
      fim = i.x + i.largura;
    }
    if (atual.trim()) celulas.push(atual.trim());
    return { celulas, confianca: Math.min(...l.map((i) => i.confianca ?? 100)) };
  });
}

// Linhas do PDF -> planilha. Acha a linha de títulos (tem "código" e "classe"); sem ela, assume
// código, classe, prazo e destinação e marca tudo como duvidoso. Texto que sobra na linha de baixo
// (sem código) é juntado à classe da linha de cima.
export function planilhaDeLinhasPdf(linhas: { celulas: string[]; confianca: number }[]): { cabecalhos: string[]; linhas: string[][]; duvidosas: boolean[] } {
  const idx = linhas.findIndex((l) => {
    const m = mapearColunas(l.celulas);
    return m.codigo !== undefined && m.nome !== undefined;
  });
  const cabecalhos = idx >= 0 ? linhas[idx].celulas : ["Código", "Classe", "Prazo", "Destinação"];
  const corpo = linhas.slice(idx + 1);
  const saida: string[][] = [];
  const duvidosas: boolean[] = [];
  const ehCodigo = (t: string | undefined) => !!t && /^[0-9][0-9A-Za-z.-]{0,19}$/.test(t);
  for (const l of corpo) {
    if (!ehCodigo(l.celulas[0]) && saida.length && l.celulas.length <= 2) {
      saida[saida.length - 1][1] = `${saida[saida.length - 1][1]} ${l.celulas.join(" ")}`.trim();
      continue;
    }
    saida.push(l.celulas);
    duvidosas.push(idx < 0 || l.confianca < 80 || !ehCodigo(l.celulas[0]) || l.celulas.length < Math.min(3, cabecalhos.length));
  }
  return { cabecalhos, linhas: saida, duvidosas };
}

// ---------------------------------------------------------------------------
// Modelo .xlsx para baixar (escrito à mão: só texto, sem fórmulas nem macros)
// ---------------------------------------------------------------------------
const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const col = (i: number) => String.fromCharCode(65 + i);

export function gerarModeloXlsx(grupos: string[]): Uint8Array {
  const exemplo = [
    ["031", "Licitações e Contratos", grupos.find((g) => /licita/i.test(g)) ?? grupos[0] ?? "Licitações e Contratos", "Processo licitatório", "12", "fixo", "eliminação", ""],
    ["035", "Dispensas e inexigibilidades", grupos.find((g) => /licita/i.test(g)) ?? grupos[0] ?? "Licitações e Contratos", "", "5", "fixo", "eliminação", "Conta do fim do ano do documento"],
    ["010", "Atas da câmara", grupos[0] ?? "Administrativo", "Ata", "", "permanente", "guarda permanente", ""],
  ];
  const celula = (t: string, r: number, c: number) => `<c r="${col(c)}${r}" t="inlineStr"><is><t>${esc(t)}</t></is></c>`;
  const linha = (cels: readonly string[], r: number) => `<row r="${r}">${cels.map((t, c) => celula(t, r, c)).join("")}</row>`;
  const dados = [COLUNAS_MODELO, ...exemplo].map((l, i) => linha(l, i + 1)).join("");
  const arquivos = {
    "[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`,
    "_rels/.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    "xl/workbook.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Temporalidade" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    "xl/_rels/workbook.xml.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`,
    "xl/worksheets/sheet1.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${dados}</sheetData></worksheet>`,
  };
  return zipSync(Object.fromEntries(Object.entries(arquivos).map(([k, v]) => [k, strToU8(v)])));
}
