import Link from "next/link";
import type { ReactNode } from "react";

// Peças do canvas usadas nas telas de Início, Usuários, Secretarias e Equipe.

const TONS = {
  ok: "bg-[#ccfbf1] text-[#115e59] dark:bg-[#0e4a45] dark:text-[#7ff0df]",
  aviso: "bg-[#fef3c7] text-[#7c2d12] dark:bg-[#3b2f0b] dark:text-[#fcd34d]",
  erro: "bg-[#fee2e2] text-[#991b1b] dark:bg-[#3f1d1d] dark:text-[#fca5a5]",
} as const;

export function Pilula({ tom, children }: { tom: keyof typeof TONS; children: ReactNode }) {
  return (
    <span className={`inline-block rounded-xl px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${TONS[tom]}`}>
      {children}
    </span>
  );
}

const FOCO = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco";

export const botaoPrimario = `inline-flex min-h-10 items-center justify-center rounded-lg bg-[linear-gradient(135deg,#0e7490,#0f766e)] px-5 text-sm font-semibold whitespace-nowrap text-white hover:opacity-90 dark:bg-none dark:bg-[#2dd4bf] dark:text-[#0b2e3a] ${FOCO}`;
export const botaoContorno = `inline-flex h-8 items-center justify-center rounded-lg border border-linha px-3 text-[12.5px] text-texto hover:border-destaque ${FOCO}`;

// Cabeçalho de painel: ícone em bloco + título + subtítulo.
export function CabecalhoPainel({ icone, titulo, subtitulo }: { icone: ReactNode; titulo: string; subtitulo?: string }) {
  return (
    <div className="flex items-center gap-3">
      <span
        aria-hidden
        className="flex size-[34px] shrink-0 items-center justify-center rounded-[10px] bg-[linear-gradient(145deg,#5eead4,#0e7490)] text-white"
      >
        {icone}
      </span>
      <div>
        <h2 className="text-base font-bold">{titulo}</h2>
        {subtitulo && <p className="text-[12.5px] text-texto-suave">{subtitulo}</p>}
      </div>
    </div>
  );
}

// Filtro em pílula (Todas · 7 | Ativas · 5 ...), feito de links.
export function Filtros({ itens }: { itens: { href: string; rotulo: string; ativo: boolean }[] }) {
  return (
    <nav aria-label="Filtro" className="inline-flex gap-[3px] rounded-[13px] border border-linha bg-campo p-[3px]">
      {itens.map((i) => (
        <Link
          key={i.rotulo}
          href={i.href}
          aria-current={i.ativo ? "true" : undefined}
          className={`inline-flex min-h-[34px] items-center rounded-[10px] px-4 text-[13px] whitespace-nowrap ${FOCO} ${
            i.ativo ? "bg-[rgba(45,212,191,.18)] font-semibold dark:bg-[rgba(45,212,191,.15)]" : "hover:bg-[rgba(14,116,144,.06)]"
          }`}
        >
          {i.rotulo}
        </Link>
      ))}
    </nav>
  );
}

// Busca por GET: funciona sem JavaScript.
export function Busca({ acao, valor, rotulo, marcador, extra }: { acao: string; valor: string; rotulo: string; marcador: string; extra?: Record<string, string> }) {
  return (
    <form action={acao} role="search" className="flex h-10 max-w-[420px] flex-1 items-center gap-2.5 rounded-[10px] border border-linha bg-campo px-3.5 focus-within:outline-2 focus-within:outline-foco">
      {Object.entries(extra ?? {}).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <svg aria-hidden width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="shrink-0 text-texto-suave">
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-4-4" />
      </svg>
      <input
        type="search"
        name="q"
        defaultValue={valor}
        aria-label={rotulo}
        placeholder={marcador}
        className="min-w-0 flex-1 bg-transparent text-sm text-texto outline-0 placeholder:text-texto-suave"
      />
    </form>
  );
}

const CORES = {
  teal: "bg-[linear-gradient(145deg,#5eead4,#0e7490)]",
  aco: "bg-[linear-gradient(145deg,#4f8592,#0b2e3a)]",
  ambar: "bg-[linear-gradient(145deg,#fde68a,#f59e0b)]",
  vermelho: "bg-[linear-gradient(145deg,#fca5a5,#dc2626)]",
} as const;

// Cartão de número do Início e da Equipe (sem a linha de tendência).
export function CartaoResumo({ rotulo, valor, legenda, cor, icone }: { rotulo: string; valor: string; legenda: string; cor: keyof typeof CORES; icone: ReactNode }) {
  return (
    <section className="relative flex min-w-0 flex-col gap-2.5 overflow-hidden rounded-[18px] border border-white/95 bg-white/78 px-5 py-[18px] shadow-[0_10px_30px_rgba(11,46,58,.08)] dark:border-[#1b3a44] dark:bg-[linear-gradient(160deg,#0d1d23_0%,#060b0d_55%)] dark:shadow-none">
      <span aria-hidden className={`absolute inset-x-0 top-0 h-1 ${CORES[cor]}`} />
      <div className="flex items-center gap-3">
        <span aria-hidden className={`flex size-10 items-center justify-center rounded-xl text-white shadow-[0_6px_14px_rgba(11,46,58,.18)] dark:shadow-[0_6px_14px_rgba(0,0,0,.45)] ${CORES[cor]}`}>
          {icone}
        </span>
        <h2 className="text-[11px] font-medium tracking-[.05em] text-texto-suave uppercase">{rotulo}</h2>
      </div>
      <p className="font-titulo text-[32px] leading-[38px] font-bold">{valor}</p>
      <p className="text-[13px] text-texto-suave">{legenda}</p>
    </section>
  );
}
