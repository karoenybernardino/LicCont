import { readSheet } from "read-excel-file/node";

// Leitura da planilha de importação (.xlsx ou .csv), só no servidor.
// Devolve texto puro: nada é executado nem interpretado como fórmula.
// Erros têm texto fixo: nunca o nome do arquivo nem o conteúdo das células.

export const LIMITE_LINHAS = 5000;
export const LIMITE_COLUNAS = 30;
export const LIMITE_BYTES_PLANILHA = 10 * 1024 * 1024;

export type Planilha = { cabecalhos: string[]; linhas: string[][] };

export class ErroPlanilha extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = "ErroPlanilha";
  }
}

const MSG = {
  formato: "Envie um arquivo .xlsx ou .csv. Arquivos com macros (.xlsm) e .xls antigo não são aceitos.",
  tamanho: "A planilha passa de 10 MB. Divida em partes menores.",
  vazia: "A planilha está vazia ou sem a linha de títulos.",
  linhas: `A planilha passa de ${LIMITE_LINHAS} linhas. Divida em partes menores.`,
  colunas: `A planilha passa de ${LIMITE_COLUNAS} colunas.`,
  ilegivel: "Não foi possível ler a planilha. Confira se o arquivo não está corrompido.",
} as const;

type Celula = string | number | boolean | Date | null | undefined;

export function celulaParaTexto(c: Celula): string {
  if (c === null || c === undefined) return "";
  if (c instanceof Date) return Number.isNaN(c.getTime()) ? "" : c.toISOString().slice(0, 10);
  return String(c).replace(/\u0000/g, "").trim();
}

// Separador mais frequente na linha de títulos fora de aspas.
function separador(primeira: string) {
  let aspas = false;
  const conta: Record<string, number> = { ";": 0, ",": 0, "\t": 0 };
  for (const ch of primeira) {
    if (ch === '"') aspas = !aspas;
    else if (!aspas && ch in conta) conta[ch]++;
  }
  return (Object.keys(conta) as string[]).sort((a, b) => conta[b] - conta[a])[0];
}

export function lerCsv(texto: string): string[][] {
  const t = texto.replace(/^﻿/, "");
  const sep = separador(t.split(/\r?\n/, 1)[0] ?? "");
  const linhas: string[][] = [];
  let linha: string[] = [];
  let campo = "";
  let aspas = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (aspas) {
      if (ch === '"') {
        if (t[i + 1] === '"') {
          campo += '"';
          i++;
        } else aspas = false;
      } else campo += ch;
    } else if (ch === '"') aspas = true;
    else if (ch === sep) {
      linha.push(campo);
      campo = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && t[i + 1] === "\n") i++;
      linha.push(campo);
      linhas.push(linha);
      linha = [];
      campo = "";
    } else campo += ch;
    if (linhas.length > LIMITE_LINHAS + 1) throw new ErroPlanilha(MSG.linhas);
  }
  if (campo !== "" || linha.length) {
    linha.push(campo);
    linhas.push(linha);
  }
  return linhas;
}

function montar(bruto: Celula[][]): Planilha {
  const linhas = bruto.map((l) => l.map(celulaParaTexto));
  // Linhas totalmente em branco no fim ou no meio não contam.
  const cheias = linhas.filter((l) => l.some((c) => c !== ""));
  if (cheias.length < 2) throw new ErroPlanilha(MSG.vazia);
  const cabecalhos = cheias[0];
  while (cabecalhos.length && cabecalhos[cabecalhos.length - 1] === "") cabecalhos.pop();
  if (!cabecalhos.length) throw new ErroPlanilha(MSG.vazia);
  if (cabecalhos.length > LIMITE_COLUNAS) throw new ErroPlanilha(MSG.colunas);
  const dados = cheias.slice(1);
  if (dados.length > LIMITE_LINHAS) throw new ErroPlanilha(MSG.linhas);
  return { cabecalhos, linhas: dados.map((l) => cabecalhos.map((_, i) => l[i] ?? "")) };
}

// Extensão e assinatura do arquivo precisam concordar (um .xlsx é um ZIP, "PK").
export async function lerPlanilha(nome: string, bytes: Uint8Array): Promise<Planilha> {
  if (bytes.byteLength > LIMITE_BYTES_PLANILHA) throw new ErroPlanilha(MSG.tamanho);
  const ext = nome.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1];
  try {
    if (ext === "csv") {
      if (bytes[0] === 0x50 && bytes[1] === 0x4b) throw new ErroPlanilha(MSG.formato);
      return montar(lerCsv(new TextDecoder("utf-8").decode(bytes)));
    }
    if (ext === "xlsx") {
      if (!(bytes[0] === 0x50 && bytes[1] === 0x4b)) throw new ErroPlanilha(MSG.formato);
      return montar((await readSheet(Buffer.from(bytes))) as Celula[][]);
    }
  } catch (e) {
    if (e instanceof ErroPlanilha) throw e;
    throw new ErroPlanilha(MSG.ilegivel);
  }
  throw new ErroPlanilha(MSG.formato);
}

// Planilha exportada pelo sistema: células que começam com = + - @ viram texto
// (senão o Excel as executa como fórmula).
export function neutralizarCelula(valor: string): string {
  return /^[=+\-@\t\r]/.test(valor) ? `'${valor}` : valor;
}

export function paraCsv(linhas: string[][]): string {
  const campo = (v: string) => {
    const t = neutralizarCelula(v);
    return /[";\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  return "﻿" + linhas.map((l) => l.map(campo).join(";")).join("\r\n") + "\r\n";
}
