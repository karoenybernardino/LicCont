"use client";

// Leitura do texto do PDF (OCR) no navegador de quem envia: tesseract.js
// (Apache-2.0) roda num worker do próprio site, com o motor e o idioma
// copiados para /ocr (scripts/copiar-ocr.mjs). O PDF e as imagens das páginas
// não saem da máquina; só o texto resultante vai ao servidor (salvarTextoPdf).
import { abrirPdf } from "./pdf-navegador";

export const MAX_PAGINAS_OCR = 40;
const MAX_CARACTERES = 300_000;

export async function lerTextoDoPdf(arquivo: File, progresso?: (pagina: number, total: number) => void): Promise<{ texto: string; paginas: number }> {
  const bytes = new Uint8Array(await arquivo.arrayBuffer());
  const tarefa = await abrirPdf({ data: bytes });
  const pdf = await tarefa.promise;
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("por", 1, { workerPath: "/ocr/worker.min.js", corePath: "/ocr/core", langPath: "/ocr/lang", workerBlobURL: false });
  try {
    const total = Math.min(pdf.numPages, MAX_PAGINAS_OCR);
    const partes: string[] = [];
    for (let n = 1; n <= total; n++) {
      progresso?.(n, total);
      const pagina = await pdf.getPage(n);
      const base = pagina.getViewport({ scale: 1 });
      const viewport = pagina.getViewport({ scale: Math.min(2, 1600 / base.width) });
      const tela = document.createElement("canvas");
      tela.width = Math.floor(viewport.width);
      tela.height = Math.floor(viewport.height);
      await pagina.render({ canvas: tela, viewport }).promise;
      const { data } = await worker.recognize(tela);
      partes.push(data.text);
      tela.width = 0;
    }
    return { texto: limpar(partes.join("\n")), paginas: total };
  } finally {
    await worker.terminate();
    await tarefa.destroy();
  }
}

// Espaços e quebras repetidos viram um espaço; sem caractere de controle.
export function limpar(texto: string) {
  return texto.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, MAX_CARACTERES);
}
