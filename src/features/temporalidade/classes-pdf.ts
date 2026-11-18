"use client";

// Leitura da tabela de temporalidade em PDF, no navegador (sem serviço externo, sem custo):
// primeiro a camada de texto do PDF (pdf.js); a página sem texto (escaneada) passa pelo OCR
// (tesseract.js, o mesmo da busca no PDF). O arquivo não sai da máquina de quem envia.
// A leitura pode errar: o resultado vai sempre para a prévia de conferência.
import { abrirPdf } from "@/features/documentos/pdf-navegador";
import { linhasDeItens, planilhaDeLinhasPdf, type ItemTexto } from "./classes-tabela";

export const MAX_PAGINAS_TABELA = 60;
const MIN_CARACTERES_COM_TEXTO = 25;

export type TabelaPdf = { cabecalhos: string[]; linhas: string[][]; duvidosas: boolean[]; paginasOcr: number };

type ItemPdfjs = { str?: string; transform?: number[]; width?: number };

function itensDoTexto(conteudo: { items: unknown[] }): ItemTexto[] {
  return (conteudo.items as ItemPdfjs[])
    .filter((i) => typeof i.str === "string" && i.transform)
    .map((i) => ({ texto: i.str as string, x: i.transform![4], y: i.transform![5], largura: i.width ?? 0 }));
}

type PalavraOcr = { text: string; confidence: number; bbox: { x0: number; y0: number; x1: number } };

export async function lerTabelaDoPdf(arquivo: File, progresso?: (pagina: number, total: number) => void): Promise<TabelaPdf> {
  const bytes = new Uint8Array(await arquivo.arrayBuffer());
  const tarefa = await abrirPdf({ data: bytes });
  const pdf = await tarefa.promise;
  let worker: Awaited<ReturnType<(typeof import("tesseract.js"))["createWorker"]>> | null = null;
  const itens: ItemTexto[] = [];
  let paginasOcr = 0;
  try {
    const total = Math.min(pdf.numPages, MAX_PAGINAS_TABELA);
    for (let n = 1; n <= total; n++) {
      progresso?.(n, total);
      const pagina = await pdf.getPage(n);
      const deslocamento = (total - n) * 10_000; // páginas seguintes ficam abaixo das anteriores
      const doTexto = itensDoTexto(await pagina.getTextContent());
      if (doTexto.reduce((s, i) => s + i.texto.length, 0) >= MIN_CARACTERES_COM_TEXTO) {
        itens.push(...doTexto.map((i) => ({ ...i, y: i.y + deslocamento })));
        continue;
      }
      // Página escaneada: OCR.
      paginasOcr++;
      worker ??= await (await import("tesseract.js")).createWorker("por", 1, { workerPath: "/ocr/worker.min.js", corePath: "/ocr/core", langPath: "/ocr/lang", workerBlobURL: false });
      const base = pagina.getViewport({ scale: 1 });
      const escala = Math.min(2, 1600 / base.width);
      const viewport = pagina.getViewport({ scale: escala });
      const tela = document.createElement("canvas");
      tela.width = Math.floor(viewport.width);
      tela.height = Math.floor(viewport.height);
      await pagina.render({ canvas: tela, viewport }).promise;
      const { data } = await worker.recognize(tela, {}, { blocks: true });
      const palavras: PalavraOcr[] = [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const b of ((data as any).blocks ?? []) as any[]) for (const p of b.paragraphs ?? []) for (const l of p.lines ?? []) for (const w of l.words ?? []) palavras.push(w);
      if (palavras.length) {
        itens.push(...palavras.map((w) => ({ texto: w.text, x: w.bbox.x0, y: deslocamento + (tela.height - w.bbox.y0), largura: w.bbox.x1 - w.bbox.x0, confianca: w.confidence })));
      } else {
        // Sem posição das palavras: usa as linhas do texto, colunas separadas por 2 ou mais espaços.
        const linhas = data.text.split(/\r?\n/).filter((t) => t.trim());
        linhas.forEach((t, i) => {
          let x = 0;
          for (const parte of t.split(/\s{2,}/)) {
            itens.push({ texto: parte, x, y: deslocamento + (linhas.length - i) * 20, largura: parte.length * 5, confianca: data.confidence });
            x += parte.length * 5 + 20;
          }
        });
      }
      tela.width = 0;
    }
    const p = planilhaDeLinhasPdf(linhasDeItens(itens));
    return { ...p, paginasOcr };
  } finally {
    await worker?.terminate();
    await tarefa.destroy();
  }
}
