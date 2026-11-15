import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { ConteudoTermo } from "./termo";

// PDF A4 em retrato, gerado no servidor com pdf-lib (código aberto, sem serviço
// externo). Fonte padrão Helvetica (acentos do português cobertos pelo WinAnsi);
// caractere fora dela vira "?" em vez de derrubar a geração.
const A4: [number, number] = [595.28, 841.89];
const M = 40;

export const seguro = (t: string, f: PDFFont) => {
  let saida = "";
  for (const c of t) {
    try {
      f.encodeText(c);
      saida += c;
    } catch {
      saida += "?";
    }
  }
  return saida;
};

export function quebrar(texto: string, f: PDFFont, tam: number, largura: number) {
  const linhas: string[] = [];
  let atual = "";
  for (const palavra of seguro(texto, f).split(/\s+/)) {
    const tenta = atual ? `${atual} ${palavra}` : palavra;
    if (f.widthOfTextAtSize(tenta, tam) <= largura) atual = tenta;
    else {
      if (atual) linhas.push(atual);
      atual = palavra;
    }
  }
  if (atual) linhas.push(atual);
  return linhas.length ? linhas : [""];
}

export async function gerarPdf(c: ConteudoTermo): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(c.titulo);
  pdf.setProducer("LicCONT");
  const normal = await pdf.embedFont(StandardFonts.Helvetica);
  const negrito = await pdf.embedFont(StandardFonts.HelveticaBold);
  const largura = A4[0] - 2 * M;
  const tinta = rgb(0.043, 0.18, 0.227); // petróleo #0b2e3a
  let pagina: PDFPage = pdf.addPage(A4);
  let y = A4[1] - M;

  const nova = () => {
    pagina = pdf.addPage(A4);
    y = A4[1] - M;
  };
  const garante = (altura: number) => {
    if (y - altura < M + 20) nova();
  };
  const texto = (t: string, f: PDFFont, tam: number, opcoes: { x?: number; larg?: number; cor?: ReturnType<typeof rgb>; espaco?: number } = {}) => {
    for (const linha of quebrar(t, f, tam, opcoes.larg ?? largura)) {
      garante(tam + 4);
      pagina.drawText(linha, { x: opcoes.x ?? M, y: y - tam, size: tam, font: f, color: opcoes.cor ?? tinta });
      y -= tam + 4;
    }
    y -= opcoes.espaco ?? 0;
  };

  texto(c.titulo, negrito, 13, { espaco: 6 });
  for (const l of c.cabecalho) texto(l, normal, 10);
  y -= 8;
  for (const p of c.paragrafos) texto(p, normal, 10, { espaco: 4 });
  y -= 6;

  // Tabela com cabeçalho repetido a cada página.
  const xs = c.tabela.larguras.reduce<number[]>((a, l, i) => [...a, (a[i] ?? M) + l * largura], [M]);
  const cabecalhoTabela = () => {
    garante(20);
    pagina.drawRectangle({ x: M, y: y - 14, width: largura, height: 16, color: rgb(0.8, 0.98, 0.95) });
    c.tabela.colunas.forEach((col, i) => pagina.drawText(seguro(col, negrito), { x: xs[i] + 3, y: y - 10, size: 8.5, font: negrito, color: tinta }));
    y -= 18;
  };
  cabecalhoTabela();
  for (const linha of c.tabela.linhas) {
    const celulas = linha.map((cel, i) => quebrar(cel, normal, 8.5, c.tabela.larguras[i] * largura - 6));
    const altura = Math.max(...celulas.map((l) => l.length)) * 11 + 4;
    if (y - altura < M + 20) {
      nova();
      cabecalhoTabela();
    }
    celulas.forEach((ls, i) => ls.forEach((l, j) => pagina.drawText(l, { x: xs[i] + 3, y: y - 9 - j * 11, size: 8.5, font: normal, color: tinta })));
    y -= altura;
    pagina.drawLine({ start: { x: M, y: y + 1 }, end: { x: M + largura, y: y + 1 }, thickness: 0.4, color: rgb(0.7, 0.8, 0.82) });
  }
  y -= 8;
  texto(c.rodape, negrito, 10, { espaco: 24 });

  garante(40 + c.assinaturas.length * 40);
  for (const a of c.assinaturas) {
    y -= 26;
    pagina.drawLine({ start: { x: M, y }, end: { x: M + 260, y }, thickness: 0.6, color: tinta });
    y -= 2;
    texto(a, normal, 9);
  }

  const total = pdf.getPageCount();
  pdf.getPages().forEach((p, i) =>
    p.drawText(`LicCONT · página ${i + 1} de ${total}`, { x: M, y: 20, size: 8, font: normal, color: rgb(0.31, 0.52, 0.57) }),
  );
  return pdf.save();
}
