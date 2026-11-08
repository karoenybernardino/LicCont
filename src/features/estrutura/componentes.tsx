import type { ReactNode } from "react";

// Peças visuais da tela Estrutura física, copiadas do canvas
// ("Estrutura física — claro/escuro").

export function Painel({ className = "", children }: { className?: string; children: ReactNode }) {
  return (
    <section
      className={`flex min-w-0 flex-col gap-3.5 rounded-2xl border border-white/95 bg-white/78 px-5 py-[18px] shadow-[0_10px_30px_rgba(11,46,58,.08),inset_0_1px_0_rgba(255,255,255,.9)] dark:border-[#1b3a44] dark:bg-[linear-gradient(160deg,#0d1d23_0%,#060b0d_55%)] dark:shadow-none ${className}`}
    >
      {children}
    </section>
  );
}

export function TituloPainel({ children }: { children: ReactNode }) {
  return <h2 className="text-[17px] font-bold">{children}</h2>;
}

export function Rotulo({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <span id={id} className="text-[11px] font-medium tracking-[.05em] text-texto-suave uppercase">
      {children}
    </span>
  );
}

const CORES = {
  teal: { fundo: "bg-[linear-gradient(145deg,#5eead4,#0e7490)]", linha: "stroke-[#0e7490] dark:stroke-[#2dd4bf]" },
  aco: { fundo: "bg-[linear-gradient(145deg,#4f8592,#0b2e3a)]", linha: "stroke-[#0b2e3a] dark:stroke-[#8cc5cf]" },
  ambar: { fundo: "bg-[linear-gradient(145deg,#fde68a,#f59e0b)]", linha: "stroke-[#b45309] dark:stroke-[#fbbf24]" },
  vermelho: { fundo: "bg-[linear-gradient(145deg,#fca5a5,#dc2626)]", linha: "stroke-[#b91c1c] dark:stroke-[#f87171]" },
} as const;

const ICONES = {
  pasta: <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />,
  folha: (
    <>
      <path d="M5 3h9l5 5v13H5z" />
      <path d="M14 3v5h5M8 13h8M8 17h6" />
    </>
  ),
  sol: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
    </>
  ),
  caixa: (
    <>
      <path d="M6 3h12v18H6z" />
      <path d="M9 8h6M9 12h6M9 16h3" />
    </>
  ),
} as const;

// Linha do cartão: valores acumulados rua a rua (A, A+B, …), de 0 a 1.
function pontosDaLinha(valores: number[]) {
  const lista = valores.length > 1 ? valores : [0, ...valores, ...valores];
  const max = Math.max(...lista, 1);
  const passo = 96 / (lista.length - 1);
  return lista.map((v, i) => `${(i * passo).toFixed(1)},${(25 - (v / max) * 22).toFixed(1)}`).join(" ");
}

export function CartaoNumero({
  rotulo,
  valor,
  legenda,
  cor,
  icone,
  serie,
}: {
  rotulo: string;
  valor: string;
  legenda: string;
  cor: keyof typeof CORES;
  icone: keyof typeof ICONES;
  serie: number[];
}) {
  const c = CORES[cor];
  return (
    <section className="relative flex min-w-0 flex-col gap-2.5 overflow-hidden rounded-[18px] border border-white/95 bg-white/78 px-5 py-[18px] shadow-[0_10px_30px_rgba(11,46,58,.08)] dark:border-[#1b3a44] dark:bg-[linear-gradient(160deg,#0d1d23_0%,#060b0d_55%)] dark:shadow-none">
      <span aria-hidden className={`absolute inset-x-0 top-0 h-1 ${c.fundo}`} />
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className={`flex size-10 items-center justify-center rounded-xl shadow-[0_6px_14px_rgba(11,46,58,.18)] dark:shadow-[0_6px_14px_rgba(0,0,0,.45)] ${c.fundo}`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            {ICONES[icone]}
          </svg>
        </span>
        <h2 className="font-sans text-[11px] font-medium tracking-[.05em] text-texto-suave uppercase">{rotulo}</h2>
      </div>
      <div className="flex items-end justify-between gap-2">
        <p className="font-titulo text-[32px] leading-[38px] font-bold">{valor}</p>
        <svg aria-hidden width="96" height="28" viewBox="0 0 96 28" className="ml-auto">
          <polyline points={pontosDaLinha(serie)} fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={c.linha} />
        </svg>
      </div>
      <p className="text-[13px] text-texto-suave">{legenda}</p>
    </section>
  );
}

export function BarraOcupacao({ percentual }: { percentual: number }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <div aria-hidden className="h-2.5 flex-1 overflow-hidden rounded-[5px] border border-linha bg-[#e3eef0] dark:bg-[#05090b]">
        <div
          className="h-full rounded-[5px] bg-[linear-gradient(90deg,#2dd4bf,#0e7490)] dark:bg-[#2dd4bf]"
          style={{ width: `${Math.min(percentual, 100)}%` }}
        />
      </div>
      <span className="w-[38px] shrink-0 text-right font-mono text-xs font-medium">{percentual}%</span>
    </div>
  );
}

export function Etiqueta({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-xl border border-[#bfe0e5] bg-[#e3f3f5] px-2.5 py-[3px] text-xs font-semibold whitespace-nowrap text-[#0b4f5c] dark:border-[#1b3a44] dark:bg-[#0d2a30] dark:text-[#99f6e4]">
      {children}
    </span>
  );
}

// Cabeçalho e linhas de tabela no estilo do canvas.
// Cabeçalho fixo ao rolar a lista (fundo opaco com a cor do canvas).
export const th = "sticky top-0 z-[1] bg-[#edf5f7] dark:bg-[#0a181c] h-[38px] px-4 text-left text-[11px] font-semibold tracking-[.05em] whitespace-nowrap text-texto-suave uppercase";
export const td = "h-14 px-4 text-sm whitespace-nowrap";
export const linhaCabecalho =
  "border-y border-linha bg-[rgba(14,116,144,.08)] dark:bg-[rgba(45,212,191,.07)]";
export function classeLinha(selecionada: boolean, par: boolean) {
  if (selecionada) return "border-b border-linha bg-[rgba(45,212,191,.18)] shadow-[inset_3px_0_0_#2dd4bf]";
  return `border-b border-linha ${par ? "bg-[rgba(14,116,144,.035)] dark:bg-[rgba(45,212,191,.03)]" : ""}`;
}
export const botaoPequeno =
  "inline-flex h-8 items-center rounded-lg border border-linha px-3 text-xs text-texto hover:border-destaque focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco";
