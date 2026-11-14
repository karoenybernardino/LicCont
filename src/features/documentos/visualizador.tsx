"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import { linkDoPdf } from "./acoes";
import { BotaoBaixar } from "./botoes";
import { abrirPdf } from "./pdf-navegador";

const botao =
  "inline-flex size-10 items-center justify-center rounded-lg border border-linha text-sm hover:border-destaque focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco disabled:opacity-40";

// Visualizador próprio (pdf.js): uma página por vez, zoom, igual em qualquer
// navegador. Lê o original por partes (HTTP Range) com um link de 5 minutos,
// renovado enquanto a tela está aberta.
export function VisualizadorPdf({ documentoId, voltar }: { documentoId: string; voltar: string }) {
  const tela = useRef<HTMLCanvasElement>(null);
  const area = useRef<HTMLDivElement>(null);
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [falha, setFalha] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [zoom, setZoom] = useState<"largura" | number>("largura");
  const tarefa = useRef<RenderTask | null>(null);

  useEffect(() => {
    let vivo = true;
    let aberto: { destroy: () => Promise<void> } | null = null;
    (async () => {
      const r = await linkDoPdf(documentoId, false);
      if (!r.url) return vivo && setFalha(true);
      try {
        const t = await abrirPdf({ url: r.url, disableAutoFetch: true, rangeChunkSize: 262144 });
        aberto = t;
        const doc = await t.promise;
        if (vivo) setPdf(doc);
      } catch {
        if (vivo) setFalha(true);
      }
    })();
    return () => {
      vivo = false;
      void aberto?.destroy();
    };
  }, [documentoId]);

  const desenhar = useCallback(async () => {
    if (!pdf || !tela.current || !area.current) return;
    const p = await pdf.getPage(pagina);
    const base = p.getViewport({ scale: 1 });
    const escala = zoom === "largura" ? Math.max(0.3, (area.current.clientWidth - 24) / base.width) : zoom;
    const viewport = p.getViewport({ scale: escala * (window.devicePixelRatio || 1) });
    const canvas = tela.current;
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    canvas.style.width = `${Math.floor(viewport.width / (window.devicePixelRatio || 1))}px`;
    tarefa.current?.cancel();
    tarefa.current = p.render({ canvas, viewport });
    try {
      await tarefa.current.promise;
    } catch {
      // Render cancelado por uma página nova: normal.
    }
  }, [pdf, pagina, zoom]);

  useEffect(() => {
    void desenhar();
    const aoRedimensionar = () => zoom === "largura" && void desenhar();
    window.addEventListener("resize", aoRedimensionar);
    return () => window.removeEventListener("resize", aoRedimensionar);
  }, [desenhar, zoom]);

  const total = pdf?.numPages ?? 0;
  const ir = (n: number) => setPagina(Math.min(Math.max(1, n), Math.max(total, 1)));
  const passo = (d: number) => setZoom((z) => Math.min(4, Math.max(0.3, (z === "largura" ? 1 : z) + d)));

  return (
    <div
      className="flex flex-col gap-3"
      onKeyDown={(e) => {
        if (e.target instanceof HTMLInputElement) return;
        if (e.key === "ArrowRight" || e.key === "PageDown") ir(pagina + 1);
        if (e.key === "ArrowLeft" || e.key === "PageUp") ir(pagina - 1);
      }}
    >
      <div role="toolbar" aria-label="Controles do PDF" className="flex flex-wrap items-center gap-2 rounded-[14px] border border-linha bg-superficie px-3 py-2">
        <button type="button" aria-label="Página anterior" disabled={!pdf || pagina <= 1} onClick={() => ir(pagina - 1)} className={botao}>‹</button>
        <label className="flex items-center gap-1.5 text-sm">
          <span className="sr-only">Página</span>
          <input
            type="number"
            min={1}
            max={total || 1}
            value={pagina}
            onChange={(e) => ir(Number(e.target.value) || 1)}
            disabled={!pdf}
            className="h-10 w-16 rounded-lg border border-borda-campo bg-campo px-2 text-center font-mono"
          />
          <span aria-live="polite">/ {total || "–"}</span>
        </label>
        <button type="button" aria-label="Próxima página" disabled={!pdf || pagina >= total} onClick={() => ir(pagina + 1)} className={botao}>›</button>
        <span aria-hidden className="mx-1 h-6 w-px bg-linha" />
        <button type="button" aria-label="Diminuir o zoom" disabled={!pdf} onClick={() => passo(-0.25)} className={botao}>−</button>
        <button type="button" disabled={!pdf} onClick={() => setZoom("largura")} aria-pressed={zoom === "largura"} className={`${botao} w-auto px-3`}>Ajustar à largura</button>
        <button type="button" aria-label="Aumentar o zoom" disabled={!pdf} onClick={() => passo(0.25)} className={botao}>+</button>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <BotaoBaixar documentoId={documentoId} />
          <Link href={voltar} className="inline-flex min-h-10 items-center rounded-lg border border-linha px-4 text-[13px] font-medium hover:border-destaque focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco">
            Voltar
          </Link>
        </div>
      </div>
      <div ref={area} className="flex min-h-[60vh] justify-center overflow-auto rounded-[14px] border border-linha bg-[#dfe8ea] p-3 dark:bg-[#0a181c]">
        {falha ? (
          <div role="alert" className="flex flex-col items-center gap-3 self-center text-center">
            <p className="text-sm">Não foi possível mostrar o PDF aqui.</p>
            <BotaoBaixar documentoId={documentoId} />
          </div>
        ) : !pdf ? (
          <p role="status" className="self-center text-sm text-texto-suave">Abrindo o PDF…</p>
        ) : (
          <canvas ref={tela} aria-label={`Página ${pagina} de ${total}`} role="img" className="h-auto max-w-none bg-white shadow-[0_6px_24px_rgba(0,0,0,.25)]" />
        )}
      </div>
    </div>
  );
}
