"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { linkDoPdf, salvarMetadadosArquivo, salvarTextoPdf } from "./acoes";
import { lerTextoDoPdf } from "./ocr-navegador";

// Digitalização pronta: metadados mínimos do Decreto 10.278/2020 (Anexo II), selo, qualidade do PDF,
// estrutura da assinatura ICP-Brasil (desligada) e a leitura do texto para a busca. O físico continua guardado.
export type DadosDigitalizacao = {
  documentoId: string;
  arquivoId: string;
  classe: string;
  codigo: string;
  grupo: string;
  prazo: string;
  destinacao: string;
  dataProducao: string;
  tipologia: string | null;
  titulo: string | null;
  assunto: string | null;
  autor: string | null;
  local: string | null;
  genero: string;
  selo: "consulta" | "valor_legal";
  assinaturaIcp: boolean;
  enviadoEm: string | null;
  sha256: string | null;
  paginas: number | null;
  avisos: string[];
  temTexto: boolean;
  podeEditar: boolean;
};

const GENEROS: Record<string, string> = { textual: "Textual", iconografico: "Iconográfico", cartografico: "Cartográfico", sonoro: "Sonoro", audiovisual: "Audiovisual", outro: "Outro" };
const SELOS = { consulta: "Digitalizado – apenas consulta", valor_legal: "Digitalizado com valor legal" } as const;
const campo = "min-h-10 w-full rounded-lg border border-borda-campo bg-campo px-3 text-sm text-texto focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-foco disabled:opacity-70";
const rotulo = "text-[11px] font-medium tracking-[.05em] text-texto-suave uppercase";
const botao = "inline-flex min-h-10 items-center justify-center rounded-lg border border-linha px-4 text-sm font-medium hover:border-destaque focus-visible:outline-2 focus-visible:outline-foco disabled:opacity-55";
const AVISOS: Record<string, string> = { resolucao_baixa: "A resolução parece menor que 300 dpi.", sem_pdfa: "O arquivo não é PDF/A." };

function Linha({ r, v, mono = false }: { r: string; v: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-texto-suave">{r}</dt>
      <dd className={`truncate font-semibold ${mono ? "font-mono text-[13px]" : ""}`} title={v}>{v}</dd>
    </div>
  );
}

export function DigitalizacaoDoc({ d }: { d: DadosDigitalizacao }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [msg, setMsg] = useState<{ erro?: string; aviso?: string } | null>(null);
  const [lendo, setLendo] = useState<string | null>(null);
  const [v, setV] = useState({ titulo: d.titulo ?? "", assunto: d.assunto ?? "", autor: d.autor ?? "", local: d.local ?? "", genero: d.genero, selo: d.selo });
  const set = (k: keyof typeof v, x: string) => setV((a) => ({ ...a, [k]: x }));

  const salvar = () =>
    iniciar(async () => {
      const r = await salvarMetadadosArquivo({ arquivo: d.arquivoId, ...v });
      setMsg(r);
      if (!r.erro) router.refresh();
    });

  // Leitura em segundo plano no navegador: camada de texto primeiro; OCR só nas páginas sem texto.
  const lerTexto = () =>
    iniciar(async () => {
      setMsg(null);
      setLendo("Baixando o PDF…");
      try {
        const link = await linkDoPdf(d.documentoId, false);
        if (!link.url) return setMsg({ erro: link.erro ?? "Não foi possível abrir o PDF." });
        const blob = await (await fetch(link.url)).blob();
        const { texto, paginas } = await lerTextoDoPdf(new File([blob], "documento.pdf", { type: "application/pdf" }), (p, t) => setLendo(`Lendo a página ${p} de ${t}…`));
        if (!texto) return setMsg({ erro: "Nenhum texto encontrado neste PDF." });
        const r = await salvarTextoPdf({ arquivo: d.arquivoId, texto, paginas });
        setMsg(r.ok ? { aviso: "Texto salvo. O PDF já pode ser achado pela busca." } : { erro: r.erro });
        if (r.ok) router.refresh();
      } catch {
        setMsg({ erro: "Não foi possível ler o texto deste PDF." });
      } finally {
        setLendo(null);
      }
    });

  return (
    <section aria-label="Digitalização" className="flex flex-col gap-4 rounded-2xl border border-linha bg-superficie px-5 py-[18px]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold">Digitalização</h2>
        <span className={`rounded-xl px-3 py-1 text-xs font-semibold ${d.selo === "valor_legal" ? "bg-[#ccfbf1] text-[#115e59] dark:bg-[#0e4a45] dark:text-[#7ff0df]" : "bg-[#e3f3f5] text-[#0b4f5c] dark:bg-[#0a1418] dark:text-texto-suave"}`}>{SELOS[d.selo]}</span>
      </div>
      {d.avisos.length > 0 && (
        <p role="status" className="rounded-lg border border-[#fcd9a0] bg-[#fff7e6] px-3 py-2 text-[13px] text-[#7a4a00] dark:border-[rgba(255,159,28,.35)] dark:bg-[rgba(255,159,28,.08)] dark:text-[#fbbf24]">
          {d.avisos.map((a) => AVISOS[a] ?? a).join(" ")} A digitalização pode não ter valor legal; ela segue valendo como consulta.
        </p>
      )}
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-4">
        <Linha r="Identificador digital" v={d.arquivoId} mono />
        <Linha r="Hash SHA-256" v={d.sha256 ?? "—"} mono />
        <Linha r="Digitalizado em" v={d.enviadoEm ? new Date(d.enviadoEm).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" }) : "—"} />
        <Linha r="Páginas" v={d.paginas ? String(d.paginas) : "—"} />
        <Linha r="Classe" v={`${d.codigo} · ${d.classe}`} />
        <Linha r="Grupo" v={d.grupo} />
        <Linha r="Prazo de guarda / destinação" v={`${d.prazo} · ${d.destinacao}`} />
        <Linha r="Data do documento original" v={d.dataProducao} />
        {d.tipologia && <Linha r="Tipo documental" v={d.tipologia} />}
      </dl>
      <p className="text-[12.5px] text-texto-suave">O responsável pela digitalização e o horário ficam na auditoria. Classe, prazo e destinação vêm da tabela de temporalidade do órgão.</p>

      <div className="grid gap-3.5 sm:grid-cols-2">
        <label className="flex flex-col gap-[5px]"><span className={rotulo}>Título</span><input value={v.titulo} maxLength={200} disabled={!d.podeEditar} onChange={(e) => set("titulo", e.target.value)} className={campo} /></label>
        <label className="flex flex-col gap-[5px]"><span className={rotulo}>Assunto</span><input value={v.assunto} maxLength={300} disabled={!d.podeEditar} onChange={(e) => set("assunto", e.target.value)} className={campo} /></label>
        <label className="flex flex-col gap-[5px]"><span className={rotulo}>Autor</span><input value={v.autor} maxLength={200} disabled={!d.podeEditar} onChange={(e) => set("autor", e.target.value)} className={campo} /></label>
        <label className="flex flex-col gap-[5px]"><span className={rotulo}>Local da digitalização</span><input value={v.local} maxLength={200} disabled={!d.podeEditar} onChange={(e) => set("local", e.target.value)} className={campo} /></label>
        <label className="flex flex-col gap-[5px]"><span className={rotulo}>Gênero documental</span>
          <select value={v.genero} disabled={!d.podeEditar} onChange={(e) => set("genero", e.target.value)} className={campo}>{Object.entries(GENEROS).map(([k, t]) => <option key={k} value={k}>{t}</option>)}</select></label>
        <label className="flex flex-col gap-[5px]"><span className={rotulo}>Selo do documento</span>
          <select value={v.selo} disabled={!d.podeEditar} onChange={(e) => set("selo", e.target.value)} className={campo}>{Object.entries(SELOS).map(([k, t]) => <option key={k} value={k}>{t}</option>)}</select></label>
      </div>
      <p className="text-[12.5px] text-texto-suave">
        Assinatura ICP-Brasil: <b>{d.assinaturaIcp ? "registrada" : "desligada"}</b> (a estrutura está pronta; a integração fica para um módulo futuro).
        {!d.assinaturaIcp && " Sem ela, o papel deste documento não pode ser eliminado."}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        {d.podeEditar && <button type="button" onClick={salvar} disabled={pendente} className={botao}>Salvar metadados</button>}
        <span className="text-[13px] text-texto-suave">Texto para a busca: <b className={d.temTexto ? "text-[#115e59] dark:text-[#7ff0df]" : ""}>{d.temTexto ? "pronto" : "pendente"}</b></span>
        {!d.temTexto && d.podeEditar && <button type="button" onClick={lerTexto} disabled={pendente} className={botao}>{lendo ?? "Ler o texto agora"}</button>}
      </div>
      <div role="status" aria-live="polite" className="min-h-5 text-sm">
        {msg?.erro && <span role="alert" className="font-medium text-[#b91c1c] dark:text-[#fca5a5]">{msg.erro}</span>}
        {msg?.aviso && <span className="font-medium text-[#115e59] dark:text-[#7ff0df]">{msg.aviso}</span>}
      </div>
    </section>
  );
}
