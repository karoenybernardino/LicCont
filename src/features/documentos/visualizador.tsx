"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import { Pilula } from "@/ui/canvas";
import { linkDoPdf } from "./acoes";
import { BotaoBaixar } from "./botoes";
import { abrirPdf } from "./pdf-navegador";

const botao =
  "inline-flex h-[34px] min-w-[34px] items-center justify-center gap-1.5 rounded-lg border border-linha bg-superficie px-2.5 text-[13px] hover:border-destaque focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco disabled:opacity-40";
const cartao =
  "flex min-w-0 flex-col gap-3.5 rounded-2xl border border-white/95 bg-white/[.78] px-5 py-[18px] shadow-[0_10px_30px_rgba(11,46,58,.08)] dark:border-linha dark:bg-superficie dark:shadow-none";
const rotulo = "text-[11px] font-medium tracking-[.05em] text-texto-suave uppercase";

export type InfoPdf = {
  titulo: string;
  arquivo: string;
  tamanho: string;
  campos: { rotulo: string; valor: string }[];
  situacao: { texto: string; tom: "ok" | "aviso" | "erro" };
  posicao: string | null;
  verNoMapa: string | null;
};

function Linha({ rotulo: r, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-2.5 text-[13px]">
      <span className="text-texto-suave">{r}</span>
      <span className="text-right font-medium">{children}</span>
    </div>
  );
}

// Miniatura de uma página: só desenha quando entra na vista (o PDF é lido por partes).
function Miniatura({ pdf, n, ativa, aoEscolher }: { pdf: PDFDocumentProxy; n: number; ativa: boolean; aoEscolher: (n: number) => void }) {
  const tela = useRef<HTMLCanvasElement>(null);
  const caixa = useRef<HTMLButtonElement>(null);
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    const el = caixa.current;
    if (!el) return;
    const o = new IntersectionObserver((e) => e.some((x) => x.isIntersecting) && setVisivel(true), { rootMargin: "200px" });
    o.observe(el);
    return () => o.disconnect();
  }, []);

  useEffect(() => {
    if (!visivel || !tela.current) return;
    let vivo = true;
    (async () => {
      const p = await pdf.getPage(n);
      const base = p.getViewport({ scale: 1 });
      const escala = 76 / base.width;
      const viewport = p.getViewport({ scale: escala * 2 });
      const canvas = tela.current;
      if (!canvas || !vivo) return;
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      canvas.style.width = `${Math.floor(viewport.width / 2)}px`;
      try {
        await p.render({ canvas, viewport }).promise;
      } catch {
        // Cancelado ao sair da tela: normal.
      }
    })();
    return () => {
      vivo = false;
    };
  }, [visivel, pdf, n]);

  return (
    <div className="flex flex-col items-center gap-[5px]">
      <button
        ref={caixa}
        type="button"
        onClick={() => aoEscolher(n)}
        aria-label={`Ir para a página ${n}`}
        aria-current={ativa ? "true" : undefined}
        className={`flex h-[132px] w-24 items-center justify-center overflow-hidden rounded bg-white shadow-[0_2px_6px_rgba(0,0,0,.15)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco ${ativa ? "border-2 border-[#0e7490] dark:border-[#2dd4bf]" : "border border-linha"}`}
      >
        <canvas ref={tela} aria-hidden className="block max-h-full" />
      </button>
      <span className="font-mono text-[11px] font-medium text-texto-suave">{n}</span>
    </div>
  );
}

// Visualizador próprio (pdf.js): uma página por vez, miniaturas, zoom, igual em
// qualquer navegador. Lê o original por partes (HTTP Range) com um link de 5
// minutos, renovado enquanto a tela está aberta.
export function VisualizadorPdf({ documentoId, voltar, info }: { documentoId: string; voltar: string; info: InfoPdf }) {
  const tela = useRef<HTMLCanvasElement>(null);
  const area = useRef<HTMLDivElement>(null);
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [falha, setFalha] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [zoom, setZoom] = useState<"largura" | number>("largura");
  const [percentual, setPercentual] = useState(100);
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
    const escala = zoom === "largura" ? Math.max(0.3, (area.current.clientWidth - 48) / base.width) : zoom;
    setPercentual(Math.round(escala * 100));
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
  const passo = (d: number) => setZoom(Math.min(4, Math.max(0.3, (zoom === "largura" ? percentual / 100 : zoom) + d)));
  const icone = (d: string) => (
    <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );

  return (
    <div
      className="flex flex-col gap-3"
      onKeyDown={(e) => {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLButtonElement) return;
        if (e.key === "ArrowRight" || e.key === "PageDown") ir(pagina + 1);
        if (e.key === "ArrowLeft" || e.key === "PageUp") ir(pagina - 1);
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-linha bg-white/[.78] px-3.5 py-2.5 dark:bg-superficie">
        <div className="flex min-w-0 items-center gap-3">
          <span aria-hidden className="flex size-9 items-center justify-center rounded-[9px] bg-[linear-gradient(145deg,#5eead4,#0e7490)] text-white">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 3h9l5 5v13H5z" />
              <path d="M14 3v5h5M8 13h8M8 17h6" />
            </svg>
          </span>
          <div className="min-w-0">
            <div className="truncate font-titulo text-[15px] font-semibold">{info.titulo}</div>
            <div className="truncate font-mono text-[11.5px] font-medium text-texto-suave">{info.arquivo}</div>
          </div>
        </div>
        <div role="toolbar" aria-label="Controles do PDF" className="flex flex-wrap items-center gap-2">
          <button type="button" aria-label="Página anterior" disabled={!pdf || pagina <= 1} onClick={() => ir(pagina - 1)} className={botao}>
            {icone("M15 18l-6-6 6-6")}
          </button>
          <label className="flex items-center gap-1.5 text-[13px] whitespace-nowrap">
            Página
            <input
              type="number"
              aria-label="Página"
              min={1}
              max={total || 1}
              value={pagina}
              onChange={(e) => ir(Number(e.target.value) || 1)}
              disabled={!pdf}
              className="h-[34px] w-14 rounded-lg border border-borda-campo bg-campo px-1 text-center font-mono text-[13px] font-semibold"
            />
            <span aria-live="polite">de {total || "–"}</span>
          </label>
          <button type="button" aria-label="Próxima página" disabled={!pdf || pagina >= total} onClick={() => ir(pagina + 1)} className={botao}>
            {icone("M9 18l6-6-6-6")}
          </button>
          <span aria-hidden className="mx-1 h-[22px] w-px bg-linha" />
          <button type="button" aria-label="Diminuir o zoom" disabled={!pdf} onClick={() => passo(-0.25)} className={botao}>
            {icone("M5 12h14")}
          </button>
          <span className="w-11 text-center font-mono text-[12.5px] font-medium">{percentual}%</span>
          <button type="button" aria-label="Aumentar o zoom" disabled={!pdf} onClick={() => passo(0.25)} className={botao}>
            {icone("M12 5v14M5 12h14")}
          </button>
          <button type="button" disabled={!pdf} onClick={() => setZoom("largura")} aria-pressed={zoom === "largura"} className={botao}>
            Ajustar
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <BotaoBaixar documentoId={documentoId} className={botao} />
          <button type="button" disabled title="Imprimir · em breve" className={`${botao} cursor-not-allowed`}>
            Imprimir
          </button>
          <Link href={voltar} aria-label="Voltar" className={botao}>
            <svg aria-hidden width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </Link>
        </div>
      </div>

      <div className="flex items-stretch gap-3 lg:h-[calc(100vh-190px)] lg:min-h-[420px]">
        <div tabIndex={-1} className="sc hidden w-32 shrink-0 flex-col items-center gap-3.5 overflow-auto rounded-[14px] border border-linha bg-white/[.78] py-3.5 md:flex dark:bg-superficie" aria-label="Páginas">
          {pdf && Array.from({ length: total }, (_, i) => <Miniatura key={i} pdf={pdf} n={i + 1} ativa={pagina === i + 1} aoEscolher={ir} />)}
        </div>

        <div className="relative min-w-0 flex-1">
          <div ref={area} tabIndex={0} role="region" aria-label="Página do documento" className="sc flex h-full min-h-[60vh] justify-center overflow-auto rounded-[14px] border border-linha bg-[#dfe8ea] p-6 dark:bg-[#0a181c]">
            {falha ? (
              <div role="alert" className="flex flex-col items-center gap-3 self-center text-center">
                <p className="text-sm">Não foi possível mostrar o PDF aqui.</p>
                <BotaoBaixar documentoId={documentoId} />
              </div>
            ) : !pdf ? (
              <p role="status" className="self-center text-sm text-texto-suave">Abrindo o PDF…</p>
            ) : (
              <canvas ref={tela} aria-label={`Página ${pagina} de ${total}. Para ler o texto, use Baixar original.`} role="img" className="h-auto max-w-none self-start bg-white shadow-[0_6px_24px_rgba(0,0,0,.25)]" />
            )}
          </div>
        </div>

        <div className="hidden w-[300px] shrink-0 flex-col gap-4 xl:flex">
          <section className={cartao} aria-label="Documento">
            <span className={rotulo}>Documento</span>
            {info.campos.map((c) => (
              <Linha key={c.rotulo} rotulo={c.rotulo}>{c.valor}</Linha>
            ))}
            <Linha rotulo="Situação">
              <Pilula tom={info.situacao.tom}>{info.situacao.texto}</Pilula>
            </Linha>
          </section>
          <section className={cartao} aria-label="Arquivo">
            <span className={rotulo}>Arquivo</span>
            <Linha rotulo="Formato">PDF</Linha>
            <Linha rotulo="Tamanho original">{info.tamanho}</Linha>
            {total > 0 && <Linha rotulo="Páginas">{total}</Linha>}
          </section>
          {info.posicao && (
            <section className={cartao} aria-label="Onde está o papel">
              <span className={rotulo}>Onde está o papel</span>
              <div className="font-mono text-sm leading-[21px] font-medium">{info.posicao}</div>
              {info.verNoMapa && (
                <Link href={info.verNoMapa} className="inline-flex min-h-10 items-center justify-center rounded-lg border border-linha px-5 text-sm font-medium hover:border-destaque focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco">
                  Ver na rua
                </Link>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
