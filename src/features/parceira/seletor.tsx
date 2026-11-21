"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";

// Seletor "Prefeitura" do topo (quadros PartPainel*), com o mesmo visual e teclado do seletor de
// secretaria (setas, Enter, Esc, clique fora). O valor vai na URL (?p=) e o servidor confere se a pessoa
// pode ver aquela prefeitura. Com "acao", troca a prefeitura em que a pessoa atua (Server Action que
// valida, grava o cookie e atualiza a tela).
export function SeletorPrefeitura({ opcoes, atual, rotulo = "Prefeitura", acao }: { opcoes: { valor: string; texto: string }[]; atual: string; rotulo?: string; acao?: (id: string) => Promise<void> }) {
  const router = useRouter();
  const [, iniciar] = useTransition();
  const caminho = usePathname();
  const [aberto, setAberto] = useState(false);
  const [ativo, setAtivo] = useState(0);
  const raiz = useRef<HTMLDivElement>(null);
  const botao = useRef<HTMLButtonElement>(null);
  const indiceAtual = Math.max(0, opcoes.findIndex((o) => o.valor === atual));
  const textoAtual = opcoes[indiceAtual]?.texto ?? "";

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: PointerEvent) => {
      if (!raiz.current?.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener("pointerdown", fora);
    return () => document.removeEventListener("pointerdown", fora);
  }, [aberto]);

  function abrir() {
    setAtivo(indiceAtual);
    setAberto(true);
  }

  function escolher(i: number) {
    setAberto(false);
    botao.current?.focus();
    const o = opcoes[i];
    if (!o || o.valor === atual) return;
    if (acao) iniciar(() => acao(o.valor));
    else router.push(`${caminho}?p=${encodeURIComponent(o.valor)}`);
  }

  function aoTeclar(e: React.KeyboardEvent) {
    const n = opcoes.length;
    if (e.key === "Escape" && aberto) {
      e.preventDefault();
      setAberto(false);
      botao.current?.focus();
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!aberto) return abrir();
      setAtivo((a) => (a + (e.key === "ArrowDown" ? 1 : n - 1)) % n);
    } else if (e.key === "Home" || e.key === "End") {
      if (!aberto) return;
      e.preventDefault();
      setAtivo(e.key === "Home" ? 0 : n - 1);
    } else if ((e.key === "Enter" || e.key === " ") && aberto) {
      e.preventDefault();
      escolher(ativo);
    } else if (e.key === "Tab") {
      setAberto(false);
    }
  }

  return (
    <div ref={raiz} onKeyDown={aoTeclar} className="relative">
      <button
        ref={botao}
        type="button"
        role="combobox"
        aria-labelledby="rotulo-prefeitura valor-prefeitura"
        aria-haspopup="listbox"
        aria-expanded={aberto}
        aria-controls="lista-prefeitura"
        aria-activedescendant={aberto ? `opcao-prefeitura-${ativo}` : undefined}
        onClick={() => (aberto ? setAberto(false) : abrir())}
        className="flex h-[38px] cursor-pointer items-center gap-2 rounded-[10px] border border-linha bg-campo pr-2.5 pl-3 text-left hover:border-borda-campo focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco"
      >
        <span id="rotulo-prefeitura" className="text-[11px] font-semibold tracking-[.05em] text-texto-suave uppercase">
          {rotulo}
        </span>
        <span id="valor-prefeitura" className="max-w-[200px] truncate text-[13px] font-semibold text-texto">
          {textoAtual}
        </span>
        <svg aria-hidden width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 text-texto-suave ${aberto ? "rotate-180" : ""}`}>
          <path d="M2 4.5l4 4 4-4" />
        </svg>
      </button>
      {aberto && (
        <ul
          id="lista-prefeitura"
          role="listbox"
          aria-labelledby="rotulo-prefeitura"
          className="absolute top-[42px] right-0 z-50 max-h-72 min-w-full overflow-auto rounded-[10px] border border-linha bg-campo p-1 shadow-lg"
        >
          {opcoes.map((o, i) => (
            <li
              key={o.valor}
              id={`opcao-prefeitura-${i}`}
              role="option"
              aria-selected={o.valor === atual}
              onPointerEnter={() => setAtivo(i)}
              onClick={() => escolher(i)}
              className={`flex cursor-pointer items-center justify-between gap-4 rounded-lg px-3 py-2 text-[13px] whitespace-nowrap text-texto ${i === ativo ? "bg-teal/15" : ""} ${o.valor === atual ? "font-bold" : "font-medium"}`}
            >
              {o.texto}
              {o.valor === atual && (
                <svg aria-hidden width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-destaque">
                  <path d="M2 6.5l3 3 5-6" />
                </svg>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
