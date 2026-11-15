import { AlignmentType, Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from "docx";
import type { ConteudoTermo } from "./termo";

// Word (.docx) gerado no servidor com a biblioteca docx (código aberto, sem serviço externo).
export async function gerarWord(c: ConteudoTermo): Promise<Buffer> {
  const celula = (t: string, largura: number, negrito = false) =>
    new TableCell({
      width: { size: Math.round(largura * 100), type: WidthType.PERCENTAGE },
      children: [new Paragraph({ children: [new TextRun({ text: t, bold: negrito, size: 17 })] })],
    });
  const tabela = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ tableHeader: true, children: c.tabela.colunas.map((col, i) => celula(col, c.tabela.larguras[i], true)) }),
      ...c.tabela.linhas.map((l) => new TableRow({ children: l.map((t, i) => celula(t, c.tabela.larguras[i])) })),
    ],
  });
  const doc = new Document({
    creator: "LicCONT",
    title: c.titulo,
    sections: [
      {
        children: [
          new Paragraph({ children: [new TextRun({ text: c.titulo, bold: true, size: 26 })], spacing: { after: 160 } }),
          ...c.cabecalho.map((l) => new Paragraph({ children: [new TextRun({ text: l, size: 20 })] })),
          new Paragraph({ text: "", spacing: { after: 120 } }),
          ...c.paragrafos.map((p) => new Paragraph({ children: [new TextRun({ text: p, size: 20 })], spacing: { after: 100 } })),
          tabela,
          new Paragraph({ children: [new TextRun({ text: c.rodape, bold: true, size: 20 })], spacing: { before: 160, after: 480 } }),
          ...c.assinaturas.flatMap((a) => [
            new Paragraph({ children: [new TextRun({ text: "______________________________________", size: 20 })], spacing: { before: 360 } }),
            new Paragraph({ children: [new TextRun({ text: a, size: 18 })], alignment: AlignmentType.LEFT }),
          ]),
        ],
      },
    ],
  });
  return Packer.toBuffer(doc);
}
