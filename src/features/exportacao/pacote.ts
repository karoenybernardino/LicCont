import { zipSync, strToU8 } from "fflate";
import { paraCsv } from "@/features/importacao/planilha";

// Pacote de devolução: CSVs (com proteção contra fórmula, vinda de paraCsv),
// PDFs originais e um arquivo de conferência com o SHA-256 de cada PDF.
export const LIMITE_PDFS_BYTES = 150 * 1024 * 1024;

export type TabelaCsv = { nome: string; cabecalhos: string[]; linhas: string[][] };
export type PdfPacote = { caminho: string; bytes: Uint8Array; sha256: string };

export function montarPacote(tabelas: TabelaCsv[], pdfs: PdfPacote[], foraDoPacote: string[][]): Uint8Array {
  const arquivos: Record<string, Uint8Array> = {};
  for (const t of tabelas) arquivos[`${t.nome}.csv`] = strToU8(paraCsv([t.cabecalhos, ...t.linhas]));
  for (const p of pdfs) arquivos[`pdfs/${p.caminho}`] = p.bytes;
  arquivos["conferencia_sha256.csv"] = strToU8(paraCsv([["arquivo", "sha256"], ...pdfs.map((p) => [`pdfs/${p.caminho}`, p.sha256])]));
  if (foraDoPacote.length) {
    arquivos["pdfs_nao_incluidos.csv"] = strToU8(paraCsv([["documento_id", "motivo"], ...foraDoPacote]));
  }
  // PDF já é comprimido: guardar sem recompressão poupa tempo.
  return zipSync(arquivos, { level: 0 });
}
