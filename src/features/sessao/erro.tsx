import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/ui/logo";

// Telas de erro do canvas (Erro 404, 403, 500 e Sessão): cartão central com ícone,
// código, título e texto. Nunca recebe dado pessoal nem detalhe técnico.

const ICONES = {
  busca: { cor: "#0e7490", corEscura: "#2dd4bf", d: <><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3M8.5 8.5l5 5M13.5 8.5l-5 5" /></> },
  cadeado: { cor: "#f59e0b", corEscura: "#f59e0b", d: <><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></> },
  alerta: { cor: "#ef4444", corEscura: "#ef4444", d: <><path d="M12 3l9 16H3z" /><path d="M12 10v4M12 17h.01" /></> },
  relogio: { cor: "#0e7490", corEscura: "#2dd4bf", d: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></> },
} as const;

export function CartaoErro({
  icone,
  codigo,
  titulo,
  texto,
  children,
  solo = false,
  papel,
}: {
  icone: keyof typeof ICONES;
  codigo?: string;
  titulo: string;
  texto: string;
  children?: ReactNode;
  /** Sem a moldura do sistema: cartão liso como no login. */
  solo?: boolean;
  papel?: "status" | "alert";
}) {
  const i = ICONES[icone];
  return (
    <section
      className={`flex w-full max-w-[560px] flex-col items-center gap-3.5 rounded-[18px] border px-9 pt-9 pb-[30px] text-center ${
        solo
          ? "border-linha bg-superficie"
          : "border-linha bg-superficie shadow-[0_20px_50px_rgba(11,46,58,.12)] dark:border-[#1b3a44] dark:bg-[linear-gradient(160deg,#0d1d23_0%,#060b0d_55%)] dark:shadow-none"
      }`}
    >
      <div
        className="flex size-[84px] items-center justify-center rounded-3xl border border-[color-mix(in_srgb,var(--c)_33%,transparent)] bg-[color-mix(in_srgb,var(--c)_12%,transparent)] [--c:var(--cor)] dark:[--c:var(--cor-escura)]"
        style={{ "--cor": i.cor, "--cor-escura": i.corEscura } as React.CSSProperties}
      >
        <svg aria-hidden width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="var(--c)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          {i.d}
        </svg>
      </div>
      {codigo && <span className="font-mono text-xs font-medium tracking-[.1em] text-texto-suave">{codigo}</span>}
      <h2 className="text-2xl font-bold">{titulo}</h2>
      <p role={papel} className="max-w-[440px] text-[14.5px] leading-[22px] text-texto-suave">{texto}</p>
      {children}
    </section>
  );
}

const BASE = "inline-flex min-h-10 items-center justify-center rounded-lg px-5 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco";
export const ESTILO_PRINCIPAL = `${BASE} font-semibold text-white bg-[linear-gradient(135deg,#0e7490,#0f766e)] hover:opacity-90 dark:bg-none dark:bg-aqua dark:text-petroleo`;
export const ESTILO_SECUNDARIO = `${BASE} font-medium border border-linha text-texto hover:border-destaque`;

export function Acoes({ children }: { children: ReactNode }) {
  return <div className="mt-2 flex flex-wrap justify-center gap-2.5">{children}</div>;
}

export function LinkPrincipal({ href, children, className = "" }: { href: string; children: ReactNode; className?: string }) {
  return (
    <Link href={href} className={`${ESTILO_PRINCIPAL} ${className}`}>
      {children}
    </Link>
  );
}

export function LinkSecundario({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className={ESTILO_SECUNDARIO}>
      {children}
    </Link>
  );
}

// Fundo e logo do canvas para erro sem sessão (o fundo vem do body).
export function MolduraErro({ children }: { children: ReactNode }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-10">
      <Logo className="text-[26px]" />
      {children}
    </main>
  );
}
