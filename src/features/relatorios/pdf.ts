import { PDFDocument, StandardFonts, rgb, type PDFPage } from "pdf-lib";
import { quebrar, seguro } from "@/features/temporalidade/pdf";
import { paraCsv } from "@/features/importacao/planilha";
import type { Relatorio } from "./definicoes";

// PDF A4 no timbrado LicCONT, gerado no servidor com pdf-lib (sem serviço externo).
// Cabeçalho do sistema e da prefeitura, título, filtros, tabela com cabeçalho
// repetido e rodapé com o código do relatório e a página.
const A4: [number, number] = [595.28, 841.89];
const M = 40;
const TINTA = rgb(0.043, 0.18, 0.227); // petróleo #0b2e3a
const AGUA = rgb(0.8, 0.98, 0.95);
const SUAVE = rgb(0.31, 0.52, 0.57);

export type Moldura = { prefeitura: string; emitidoEm: string; codigo: string };

export async function gerarRelatorioPdf(r: Relatorio, m: Moldura): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(r.titulo);
  pdf.setProducer("LicCONT");
  const normal = await pdf.embedFont(StandardFonts.Helvetica);
  const negrito = await pdf.embedFont(StandardFonts.HelveticaBold);
  const largura = A4[0] - 2 * M;
  let pagina: PDFPage;
  let y = 0;

  const cabecalho = () => {
    pagina = pdf.addPage(A4);
    pagina.drawRectangle({ x: M, y: A4[1] - M - 14, width: 34, height: 18, color: TINTA });
    pagina.drawText("Lic", { x: M + 5, y: A4[1] - M - 9, size: 9, font: negrito, color: rgb(1, 1, 1) });
    pagina.drawText("Cont", { x: M + 40, y: A4[1] - M - 9, size: 9, font: negrito, color: TINTA });
    const dir = seguro(`${m.prefeitura} · ${m.emitidoEm}`, normal);
    pagina.drawText(dir, { x: A4[0] - M - normal.widthOfTextAtSize(dir, 8.5), y: A4[1] - M - 9, size: 8.5, font: normal, color: SUAVE });
    y = A4[1] - M - 30;
  };
  const garante = (altura: number) => {
    if (y - altura < M + 24) cabecalho();
  };

  cabecalho();
  for (const l of quebrar(r.titulo, negrito, 14, largura)) {
    pagina!.drawText(l, { x: M, y: y - 14, size: 14, font: negrito, color: TINTA });
    y -= 20;
  }
  for (const linha of r.linhasDeCabecalho) {
    for (const l of quebrar(linha, normal, 9.5, largura)) {
      pagina!.drawText(l, { x: M, y: y - 9.5, size: 9.5, font: normal, color: TINTA });
      y -= 13;
    }
  }
  y -= 8;

  const xs = r.larguras.reduce<number[]>((a, l, i) => [...a, (a[i] ?? M) + l * largura], [M]);
  const titulosColunas = () => {
    garante(22);
    pagina!.drawRectangle({ x: M, y: y - 14, width: largura, height: 16, color: AGUA });
    r.colunas.forEach((c, i) => pagina!.drawText(seguro(c, negrito), { x: xs[i] + 3, y: y - 10, size: 8.5, font: negrito, color: TINTA }));
    y -= 18;
  };
  titulosColunas();
  for (const linha of r.linhas) {
    const celulas = linha.map((c, i) => quebrar(c, normal, 8.5, r.larguras[i] * largura - 6));
    const altura = Math.max(...celulas.map((l) => l.length)) * 11 + 4;
    if (y - altura < M + 24) {
      cabecalho();
      titulosColunas();
    }
    celulas.forEach((ls, i) => ls.forEach((l, j) => pagina!.drawText(l, { x: xs[i] + 3, y: y - 9 - j * 11, size: 8.5, font: normal, color: TINTA })));
    y -= altura;
    pagina!.drawLine({ start: { x: M, y: y + 1 }, end: { x: M + largura, y: y + 1 }, thickness: 0.4, color: rgb(0.7, 0.8, 0.82) });
  }
  if (!r.linhas.length) {
    pagina!.drawText("Nenhum registro para os filtros escolhidos.", { x: M + 3, y: y - 12, size: 9.5, font: normal, color: TINTA });
  }

  const total = pdf.getPageCount();
  pdf.getPages().forEach((p, i) =>
    p.drawText(seguro(`Relatório ${m.codigo} · ${r.linhas.length} registros · timbrado LicCONT · página ${i + 1} de ${total}`, normal), { x: M, y: 20, size: 8, font: normal, color: SUAVE }),
  );
  return pdf.save();
}

// Planilha (CSV com BOM e ponto e vírgula, abre direto no Excel). Células que
// começam com = + - @ viram texto: o Excel não executa como fórmula.
export function gerarRelatorioPlanilha(r: Relatorio): string {
  return paraCsv([...r.linhasDeCabecalho.map((l) => [l]), [], r.colunas, ...r.linhas]);
}
