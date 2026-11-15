import type { ReactNode } from "react";
import Link from "next/link";
import { Logo } from "@/ui/logo";
import { SeletorTema } from "@/ui/seletor-tema";

// Páginas públicas de texto jurídico. Os textos são rascunho técnico e mostram
// o aviso até o advogado validar (docs/lgpd/).
export const VERSAO_TEXTOS = "2026-11-rascunho-1";

export function PaginaLegal({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="flex-1">
      <header className="mx-auto flex w-full max-w-[820px] items-center justify-between px-5 py-5">
        <Link href="/" aria-label="Voltar ao início">
          <Logo className="text-xl" />
        </Link>
        <SeletorTema />
      </header>
      <main className="mx-auto flex w-full max-w-[820px] flex-col gap-5 px-5 pb-16 pt-6 text-[15px] leading-[1.7]">
        <h1 className="font-titulo text-3xl font-bold">{titulo}</h1>
        <p role="note" className="rounded-lg border border-linha bg-superficie-2 px-4 py-3 text-sm">
          Texto em revisão: ainda será validado por advogado antes do uso com prefeituras. Versão {VERSAO_TEXTOS}.
        </p>
        {children}
      </main>
    </div>
  );
}

export function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-titulo text-lg font-bold">{titulo}</h2>
      {children}
    </section>
  );
}
