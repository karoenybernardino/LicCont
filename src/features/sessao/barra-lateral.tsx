"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Marca } from "@/ui/logo";

// Barra lateral de ícones do canvas ("Menu"). Telas de fases futuras
// aparecem apagadas, sem link, com o aviso "Em breve".
const ICONES = {
  inicio: <path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  pesquisa: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-4-4" />
    </>
  ),
  mapa: (
    <>
      <path d="M12 2l9 5v10l-9 5-9-5V7z" />
      <path d="M12 12l9-5M12 12L3 7M12 12v10" />
    </>
  ),
  cadastro: <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />,
  emprestimos: (
    <>
      <path d="M6 3h12v18H6z" />
      <path d="M9 8h6M9 12h6M9 16h3" />
    </>
  ),
  temporalidade: (
    <>
      <path d="M5 3h9l5 5v13H5z" />
      <path d="M14 3v5h5M8 13h8M8 17h6" />
    </>
  ),
  auditoria: <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 14h2v2M14 18h2v2M18 18h2v2" />,
  configuracoes: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
    </>
  ),
  estrutura: (
    <>
      <path d="M3 21V9l9-5 9 5v12" />
      <path d="M7 21v-7h10v7M7 17.5h10" />
    </>
  ),
  usuarios: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 5a3.2 3.2 0 0 1 0 6M18 14c1.7.7 3 2.5 3 5" />
    </>
  ),
  secretarias: (
    <>
      <path d="M4 21V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v16M14 10h5a1 1 0 0 1 1 1v10M2 21h20" />
      <path d="M8 8h2M8 12h2M8 16h2" />
    </>
  ),
} as const;

export type IconeMenu = keyof typeof ICONES;
export type ItemMenu = { href?: string; rotulo: string; icone: IconeMenu; prefixos?: string[] };

export function Icone({ nome, className = "" }: { nome: IconeMenu; className?: string }) {
  return (
    <svg
      aria-hidden
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {ICONES[nome]}
    </svg>
  );
}

const botao =
  "relative flex size-11 shrink-0 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aqua";

export function BarraLateral({
  principais,
  admin,
  sair,
}: {
  principais: ItemMenu[];
  admin: ItemMenu[];
  sair: ReactNode;
}) {
  const caminho = usePathname();
  const ativo = (i: ItemMenu) =>
    !!i.href &&
    (caminho !== "/documentos/novo" || i.href === "/documentos/novo") && (caminho === i.href || caminho.startsWith(`${i.href}/`) || !!i.prefixos?.some((p) => caminho.startsWith(p)));

  function renderItem(i: ItemMenu) {
    if (!i.href) {
      return (
        <li key={i.rotulo}>
          <span
            role="img"
            aria-label={`${i.rotulo} (em breve)`}
            title={`${i.rotulo} · em breve`}
            className={`${botao} cursor-not-allowed text-[#8cc5cf] opacity-35`}
          >
            <Icone nome={i.icone} />
          </span>
        </li>
      );
    }
    const a = ativo(i);
    return (
      <li key={i.href}>
        <Link
          href={i.href}
          aria-label={i.rotulo}
          title={i.rotulo}
          aria-current={a ? "page" : undefined}
          className={`${botao} ${a ? "bg-aqua text-petroleo" : "text-[#8cc5cf] hover:shadow-[0_0_0_1.5px_var(--marca-aqua)]"}`}
        >
          <Icone nome={i.icone} />
          {a && <span aria-hidden className="absolute top-3.5 -right-3 hidden h-4 w-1.5 rounded-r-md bg-aqua md:block" />}
        </Link>
      </li>
    );
  }

  return (
    <aside
      aria-label="Menu"
      className="flex shrink-0 gap-3 rounded-[34px] border border-white/18 bg-[linear-gradient(180deg,#0b2e3a,#0f4252)] p-3 max-md:flex-row max-md:items-center max-md:overflow-x-auto md:h-full md:overflow-y-auto md:[scrollbar-width:none] md:w-[68px] md:flex-col md:items-center md:px-0 md:py-[18px] dark:border-[#1b3a44] dark:bg-[linear-gradient(180deg,#0b2e3a,#02090c)]"
    >
      <Link
        href="/inicio"
        aria-label="LicCONT, ir ao início"
        className="flex h-11 shrink-0 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aqua"
      >
        <Marca largura={30} />
      </Link>
      <div aria-hidden className="h-px w-7 bg-white/18 max-md:h-7 max-md:w-px md:my-1" />
      <nav aria-label="Menu do sistema" className="max-md:contents">
        <ul className="flex gap-3 max-md:flex-row md:flex-col md:items-center">{principais.map(renderItem)}</ul>
      </nav>
      <div className="max-md:hidden md:flex-1" />
      <div aria-hidden className="h-px w-7 bg-white/18 max-md:h-7 max-md:w-px" />
      <ul className="flex gap-3 max-md:flex-row md:flex-col md:items-center">
        {admin.map(renderItem)}
        <li>{sair}</li>
      </ul>
    </aside>
  );
}
