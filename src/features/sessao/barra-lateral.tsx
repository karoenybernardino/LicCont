"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
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
  etiquetas: <path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9zM7.5 7.5h.01" />,
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
  painel: (
    <>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </>
  ),
  importados: (
    <>
      <path d="M12 3v12M7 10l5 5 5-5" />
      <path d="M4 17v3h16v-3" />
    </>
  ),
  relatorios: (
    <>
      <path d="M5 3h9l5 5v13H5z" />
      <path d="M14 3v5h5M8 17v-3M12 17v-6M16 17v-4" />
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
export type ItemMenu = { href?: string; rotulo: string; dica?: string; icone: IconeMenu; prefixos?: string[]; contagem?: number; filhos?: ItemMenu[] };

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

type Dica = { chave: string; rotulo: string; texto?: string; x: number; y: number; embaixo: boolean };

// Grupos separados por um traço; o rodapé (Configurações, Sair) fica no fim da barra.
export function BarraLateral({
  grupos,
  rodape,
  sair,
}: {
  grupos: ItemMenu[][];
  rodape: ItemMenu[];
  sair: ReactNode;
}) {
  const caminho = usePathname();
  const idDica = useId();
  const [dica, setDica] = useState<Dica | null>(null);
  const ativo = (i: ItemMenu) =>
    !!i.href &&
    (caminho !== "/documentos/novo" || i.href === "/documentos/novo") && (caminho === i.href || caminho.startsWith(`${i.href}/`) || !!i.prefixos?.some((p) => caminho.startsWith(p)));

  // Esc fecha a aba sem tirar o foco de onde está.
  useEffect(() => {
    if (!dica) return;
    const fechar = (e: KeyboardEvent) => e.key === "Escape" && setDica(null);
    document.addEventListener("keydown", fechar);
    return () => document.removeEventListener("keydown", fechar);
  }, [dica]);

  // Posição fixa (a barra rola e cortaria uma aba absoluta): ao lado do ícone no
  // computador, embaixo dele no celular, onde a barra é uma faixa no topo.
  function mostrar(chave: string, rotulo: string, texto: string | undefined, alvo: HTMLElement) {
    const r = alvo.getBoundingClientRect();
    const embaixo = window.innerWidth < 768;
    setDica({
      chave,
      rotulo,
      texto,
      embaixo,
      x: embaixo ? Math.min(Math.max(r.left + r.width / 2, 110), window.innerWidth - 110) : r.right + 14,
      y: embaixo ? r.bottom + 10 : r.top + r.height / 2,
    });
  }
  const dicaDe = (chave: string, rotulo: string, texto?: string) => ({
    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => mostrar(chave, rotulo, texto, e.currentTarget),
    onMouseLeave: () => setDica(null),
    onFocus: (e: React.FocusEvent<HTMLElement>) => mostrar(chave, rotulo, texto, e.currentTarget),
    onBlur: () => setDica(null),
  });

  function renderItem(i: ItemMenu) {
    if (i.filhos) return <Agrupador key={i.rotulo} item={i} ativo={ativo} />;
    const chave = i.href ?? i.rotulo;
    const desc = dica?.chave === chave ? idDica : undefined;
    if (!i.href) {
      return (
        <li key={chave} {...dicaDe(chave, i.rotulo, i.dica ? `${i.dica} Em breve.` : "Em breve.")}>
          <span
            role="img"
            tabIndex={0}
            aria-label={`${i.rotulo} (em breve)`}
            aria-describedby={desc}
            className={`${botao} cursor-not-allowed text-[#8cc5cf] opacity-35`}
          >
            <Icone nome={i.icone} />
          </span>
        </li>
      );
    }
    const a = ativo(i);
    return (
      <li key={chave} {...dicaDe(chave, i.rotulo, i.dica)}>
        <Link
          href={i.href}
          aria-label={i.contagem ? `${i.rotulo}, ${i.contagem > 99 ? "99+" : i.contagem} na fila` : i.rotulo}
          aria-describedby={desc}
          aria-current={a ? "page" : undefined}
          className={`${botao} ${a ? "bg-aqua text-petroleo" : "text-[#8cc5cf] hover:shadow-[0_0_0_1.5px_var(--marca-aqua)]"}`}
        >
          <Icone nome={i.icone} />
          {!!i.contagem && (
            <span aria-hidden className="absolute -top-1 -right-1 flex min-w-4 items-center justify-center rounded-full bg-[#b45309] px-1 text-[10px] font-bold text-white">
              {i.contagem > 99 ? "99+" : i.contagem}
            </span>
          )}
          {a && <span aria-hidden className="absolute top-3.5 -right-3 hidden h-4 w-1.5 rounded-r-md bg-aqua md:block" />}
        </Link>
      </li>
    );
  }

  const traco = <div aria-hidden className="h-px w-7 shrink-0 bg-white/18 max-md:h-7 max-md:w-px md:my-1" />;

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
      <nav aria-label="Menu do sistema" className="flex gap-3 max-md:flex-row max-md:items-center md:flex-col md:items-center">
        {grupos
          .filter((g) => g.length > 0)
          .map((g) => (
            <div key={g[0]!.rotulo} className="contents">
              {traco}
              <ul className="flex gap-3 max-md:flex-row md:flex-col md:items-center">{g.map(renderItem)}</ul>
            </div>
          ))}
      </nav>
      <div className="max-md:hidden md:flex-1" />
      {traco}
      <ul className="flex gap-3 max-md:flex-row md:flex-col md:items-center">
        {rodape.map(renderItem)}
        <li {...dicaDe("sair", "Sair", "Encerra a sessão neste aparelho.")}>{sair}</li>
      </ul>
      {dica && (
        <div
          id={idDica}
          role="tooltip"
          style={{ left: dica.x, top: dica.y }}
          className={`pointer-events-none fixed z-50 w-max max-w-[220px] rounded-2xl border border-white/18 bg-[#0b2e3a] px-3 py-2 text-left shadow-lg dark:border-[#1b3a44] dark:bg-[#02090c] ${dica.embaixo ? "-translate-x-1/2" : "-translate-y-1/2"}`}
        >
          <span className="block text-[13px] font-bold text-white">{dica.rotulo}</span>
          {dica.texto && <span className="mt-0.5 block text-xs leading-snug text-[#8cc5cf]">{dica.texto}</span>}
        </div>
      )}
    </aside>
  );
}

// Item que abre um submenu ao lado da barra (ao clicar, passar o mouse ou focar). Esc fecha
// e devolve o foco ao botão; clicar fora fecha. Posição fixa: a barra rola e cortaria o painel.
function Agrupador({ item, ativo }: { item: ItemMenu; ativo: (i: ItemMenu) => boolean }) {
  const [aberto, setAberto] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number; embaixo: boolean }>({ x: 0, y: 0, embaixo: false });
  const raiz = useRef<HTMLLIElement>(null);
  const botaoRef = useRef<HTMLButtonElement>(null);
  const idPainel = useId();
  const caminho = usePathname();
  const filhos = item.filhos ?? [];
  const aqui = filhos.some(ativo) || caminho === "/configuracoes";

  const abrir = () => {
    const r = botaoRef.current?.getBoundingClientRect();
    if (!r) return;
    const embaixo = window.innerWidth < 768;
    setPos({
      embaixo,
      x: embaixo ? Math.min(Math.max(r.left + r.width / 2, 130), window.innerWidth - 130) : r.right,
      // No computador a barra termina no rodapé: o painel cresce para cima, alinhado ao fim do ícone.
      y: embaixo ? r.bottom : window.innerHeight - r.bottom,
    });
    setAberto(true);
  };

  useEffect(() => {
    if (!aberto) return;
    const tecla = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setAberto(false);
      botaoRef.current?.focus();
    };
    const fora = (e: MouseEvent) => !raiz.current?.contains(e.target as Node) && setAberto(false);
    document.addEventListener("keydown", tecla);
    document.addEventListener("mousedown", fora);
    return () => {
      document.removeEventListener("keydown", tecla);
      document.removeEventListener("mousedown", fora);
    };
  }, [aberto]);

  return (
    <li
      ref={raiz}
      onMouseEnter={abrir}
      onMouseLeave={() => setAberto(false)}
      onBlur={(e) => !raiz.current?.contains(e.relatedTarget as Node | null) && setAberto(false)}
    >
      <button
        ref={botaoRef}
        type="button"
        aria-label={item.rotulo}
        aria-haspopup="true"
        aria-expanded={aberto}
        aria-controls={aberto ? idPainel : undefined}
        aria-current={aqui ? "page" : undefined}
        onClick={() => (aberto ? setAberto(false) : abrir())}
        className={`${botao} ${aqui ? "bg-aqua text-petroleo" : "text-[#8cc5cf] hover:shadow-[0_0_0_1.5px_var(--marca-aqua)]"}`}
      >
        <Icone nome={item.icone} />
      </button>
      {aberto && (
        <div
          style={pos.embaixo ? { left: pos.x, top: pos.y } : { left: pos.x, bottom: pos.y }}
          className={`fixed z-50 ${pos.embaixo ? "-translate-x-1/2 pt-2.5" : "pl-3.5"}`}
        >
          <div
            id={idPainel}
            role="group"
            aria-label={item.rotulo}
            onClick={(e) => (e.target as HTMLElement).closest("a") && setAberto(false)}
            className="w-[250px] max-w-[calc(100vw-24px)] rounded-2xl border border-white/18 bg-[#0b2e3a] p-1.5 shadow-lg dark:border-[#1b3a44] dark:bg-[#02090c]"
          >
            <Link
              href="/configuracoes"
              className="block rounded-xl px-3 py-2 text-[13px] font-bold text-white hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-aqua"
            >
              {item.rotulo}
              {item.dica && <span className="mt-0.5 block text-xs font-normal leading-snug text-[#8cc5cf]">{item.dica}</span>}
            </Link>
            <div aria-hidden className="mx-2 my-1 h-px bg-white/18" />
            <ul className="flex flex-col">
              {filhos.map((f) => (
                <li key={f.href}>
                  <Link
                    href={f.href!}
                    aria-current={ativo(f) ? "page" : undefined}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] focus-visible:outline-2 focus-visible:outline-aqua ${ativo(f) ? "bg-aqua text-petroleo" : "text-white hover:bg-white/10"}`}
                  >
                    <Icone nome={f.icone} className="shrink-0" />
                    {f.rotulo}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </li>
  );
}
