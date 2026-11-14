"use client";

// Roda só no navegador de quem cadastra: pdf.js (Mozilla, Apache-2.0) desenha
// as páginas na máquina da pessoa; o PDF não vai a nenhum serviço. É só para
// avisar cedo: o servidor confere tudo de novo (conferencia.ts).
import type { PDFDocumentProxy } from "pdfjs-dist";

export type Analise = {
  paginas: number;
  avisos: ("resolucao_baixa" | "sem_pdfa")[];
  miniatura: Blob | null;
};
export type FalhaAnalise = "nao_pdf" | "com_senha" | "corrompido";

let preparado: Promise<typeof import("pdfjs-dist")> | null = null;

export function carregarPdfjs() {
  preparado ??= import("pdfjs-dist").then((pdfjs) => {
    pdfjs.GlobalWorkerOptions.workerPort = new Worker(new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url), {
      type: "module",
    });
    return pdfjs;
  });
  return preparado;
}

export async function abrirPdf(origem: { data: Uint8Array } | { url: string; rangeChunkSize?: number; disableAutoFetch?: boolean }) {
  const pdfjs = await carregarPdfjs();
  return pdfjs.getDocument(origem);
}

// Resolução mais baixa entre as imagens das 3 primeiras páginas (dpi estimado).
async function menorDpi(pdf: PDFDocumentProxy) {
  const pdfjs = await carregarPdfjs();
  let menor = Infinity;
  for (let n = 1; n <= Math.min(3, pdf.numPages); n++) {
    const pagina = await pdf.getPage(n);
    const larguraPol = pagina.getViewport({ scale: 1 }).width / 72;
    const ops = await pagina.getOperatorList();
    ops.fnArray.forEach((fn, i) => {
      if (fn !== pdfjs.OPS.paintImageXObject && fn !== pdfjs.OPS.paintInlineImageXObject) return;
      const arg = ops.argsArray[i]?.[0];
      const largura = typeof arg === "object" && arg && "width" in arg ? Number((arg as { width: number }).width) : 0;
      if (largura > 0) menor = Math.min(menor, largura / larguraPol);
    });
  }
  return menor;
}

async function miniaturaDaPrimeira(pdf: PDFDocumentProxy) {
  const pagina = await pdf.getPage(1);
  const base = pagina.getViewport({ scale: 1 });
  const viewport = pagina.getViewport({ scale: 240 / base.width });
  const tela = document.createElement("canvas");
  tela.width = Math.floor(viewport.width);
  tela.height = Math.floor(viewport.height);
  await pagina.render({ canvas: tela, viewport }).promise;
  return new Promise<Blob | null>((ok) => tela.toBlob((b) => ok(b), "image/webp", 0.8));
}

export async function analisarPdf(arquivo: File): Promise<Analise | { falha: FalhaAnalise }> {
  const bytes = new Uint8Array(await arquivo.arrayBuffer());
  if (bytes.length < 5 || String.fromCharCode(...bytes.subarray(0, 5)) !== "%PDF-") return { falha: "nao_pdf" };
  let pdf: PDFDocumentProxy;
  const tarefa = await abrirPdf({ data: bytes });
  try {
    pdf = await tarefa.promise;
  } catch (e) {
    return { falha: e instanceof Error && e.name === "PasswordException" ? "com_senha" : "corrompido" };
  }
  const avisos: Analise["avisos"] = [];
  try {
    const meta = await pdf.getMetadata();
    const xmp = (meta.metadata as { getRaw?: () => string } | null)?.getRaw?.() ?? "";
    if (!/pdfaid:part/i.test(xmp)) avisos.push("sem_pdfa");
    if ((await menorDpi(pdf)) < 300) avisos.push("resolucao_baixa");
  } catch {
    // Aviso é só uma ajuda: não impede o envio.
  }
  let miniatura: Blob | null = null;
  try {
    miniatura = await miniaturaDaPrimeira(pdf);
  } catch {
    miniatura = null;
  }
  const paginas = pdf.numPages;
  await tarefa.destroy();
  return { paginas, avisos, miniatura };
}

// Envio direto ao Storage pelo link assinado (PUT multipart, como o supabase-js).
// Sem retomada nesta versão: se a internet cair, o envio recomeça do zero.
export function enviarParaStorage(url: string, corpo: Blob, progresso?: (parte: number) => void) {
  return new Promise<boolean>((ok) => {
    const form = new FormData();
    form.append("cacheControl", "3600");
    form.append("", corpo);
    const req = new XMLHttpRequest();
    req.open("PUT", url);
    req.setRequestHeader("x-upsert", "false");
    req.upload.onprogress = (e) => e.lengthComputable && progresso?.(e.loaded / e.total);
    req.onload = () => ok(req.status >= 200 && req.status < 300);
    req.onerror = () => ok(false);
    req.send(form);
  });
}
