import { zipSync, strToU8 } from "fflate";
import { paraCsv } from "@/features/importacao/planilha";

// Pacote de devolução: CSVs (com proteção contra fórmula, vinda de paraCsv),
// PDFs originais e um arquivo de conferência com o SHA-256 de cada PDF.
// Sai em volumes: o 1º com as planilhas, os demais com PDFs. Cada volume
// cabe no teto de 50 MB por arquivo do Storage gratuito (migração do bucket).
export const LIMITE_PDFS_BYTES = 150 * 1024 * 1024;
export const LIMITE_VOLUME_BYTES = 40 * 1024 * 1024;

export type TabelaCsv = { nome: string; cabecalhos: string[]; linhas: string[][] };
export type PdfPacote = { caminho: string; bytes: Uint8Array; sha256: string };

export function montarPacote(tabelas: TabelaCsv[], pdfs: PdfPacote[], foraDoPacote: string[][], avisos: string[] = []): Uint8Array {
  const arquivos: Record<string, Uint8Array | [Uint8Array, { level: 6 }]> = {};
  const csv = (t: string) => [strToU8(t), { level: 6 }] as [Uint8Array, { level: 6 }];
  for (const t of tabelas) arquivos[`${t.nome}.csv`] = csv(paraCsv([t.cabecalhos, ...t.linhas]));
  for (const p of pdfs) arquivos[`pdfs/${p.caminho}`] = p.bytes;
  arquivos["conferencia_sha256.csv"] = csv(paraCsv([["arquivo", "sha256"], ...pdfs.map((p) => [`pdfs/${p.caminho}`, p.sha256])]));
  if (foraDoPacote.length) {
    arquivos["pdfs_nao_incluidos.csv"] = csv(paraCsv([["documento_id", "motivo"], ...foraDoPacote]));
  }
  if (avisos.length) arquivos["LEIA-ME.txt"] = strToU8(avisos.join("\n") + "\n");
  // PDF já é comprimido: guardar sem recompressão poupa tempo.
  return zipSync(arquivos, { level: 0 });
}

// Volume 1: planilhas e avisos. Volumes 2..n: PDFs, até LIMITE_VOLUME_BYTES cada.
// shortcut: planilhas num volume só; se passarem de 50 MB compactadas, partir por tabela.
export function montarVolumes(tabelas: TabelaCsv[], pdfs: PdfPacote[], foraDoPacote: string[][], avisos: string[] = []): Uint8Array[] {
  const grupos: PdfPacote[][] = [];
  let atual: PdfPacote[] = [];
  let bytes = 0;
  for (const p of pdfs) {
    if (atual.length && bytes + p.bytes.length > LIMITE_VOLUME_BYTES) {
      grupos.push(atual);
      atual = [];
      bytes = 0;
    }
    atual.push(p);
    bytes += p.bytes.length;
  }
  if (atual.length) grupos.push(atual);
  return [montarPacote(tabelas, [], foraDoPacote, avisos), ...grupos.map((g) => montarPacote([], g, []))];
}
