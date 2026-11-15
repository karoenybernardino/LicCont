"use client";

import { useEffect, useRef, useState } from "react";

type Rua = { id: string; codigo: string; modulos: number; percentual: number };

// Escolha de rua com busca (quadro "Cadastro novo"): botão que abre uma lista
// filtrável, com módulos e ocupação de cada rua. Enter escolhe a primeira; Esc fecha.
export function EscolhaRua({ ruas, valor, aoEscolher, id }: { ruas: Rua[]; valor: string; aoEscolher: (id: string) => void; id?: string }) {
  const [aberta, setAberta] = useState(false);
  const [busca, setBusca] = useState("");
  const caixa = useRef<HTMLDivElement>(null);
  const atual = ruas.find((r) => r.id === valor);
  const termo = busca.trim().toLocaleLowerCase("pt-BR");
  const lista = ruas.filter((r) => !termo || `rua ${r.codigo}`.toLocaleLowerCase("pt-BR").includes(termo));

  useEffect(() => {
    if (!aberta) return;
    const fora = (e: MouseEvent) => caixa.current && !caixa.current.contains(e.target as Node) && setAberta(false);
    document.addEventListener("mousedown", fora);
    return () => document.removeEventListener("mousedown", fora);
  }, [aberta]);

  function escolher(r: Rua) {
    aoEscolher(r.id);
    setAberta(false);
    setBusca("");
  }

  return (
    <div ref={caixa} className="relative" onKeyDown={(e) => e.key === "Escape" && setAberta(false)}>
      <button
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={aberta}
        onClick={() => setAberta((a) => !a)}
        className="flex min-h-10 w-full items-center justify-between rounded-lg border border-borda-campo bg-campo px-3 text-left font-mono text-sm font-medium text-texto focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-foco"
      >
        <span>{atual ? `Rua ${atual.codigo}` : "Escolha…"}</span>
        <svg aria-hidden width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
      </button>
      {aberta && (
        <div className="absolute top-[46px] left-0 z-10 w-[300px] max-w-[90vw] rounded-xl border border-linha bg-campo p-2 shadow-[0_18px_40px_rgba(0,0,0,.28)] dark:bg-[#0a1418]">
          <label className="mb-1 flex min-h-[38px] items-center gap-2 rounded-lg border border-linha px-2.5 text-sm text-texto-suave">
            <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
            <span className="sr-only">Buscar rua</span>
            <input
              autoFocus
              value={busca}
              maxLength={20}
              placeholder="Buscar rua…"
              onChange={(e) => setBusca(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (lista[0]) escolher(lista[0]);
                }
              }}
              className="min-w-0 flex-1 bg-transparent text-texto outline-0"
            />
          </label>
          <ul role="listbox" aria-label="Ruas" className="max-h-[92px] overflow-y-scroll pr-1">
            {lista.map((r) => (
              <li key={r.id} role="option" aria-selected={r.id === valor}>
                <button
                  type="button"
                  onClick={() => escolher(r)}
                  className={`flex min-h-11 w-full flex-col justify-center rounded-lg px-3 py-1.5 text-left hover:shadow-[inset_0_0_0_1.5px_var(--foco)] focus-visible:outline-2 focus-visible:outline-foco ${r.id === valor ? "bg-[rgba(45,212,191,.18)] dark:bg-[linear-gradient(90deg,rgba(45,212,191,.2),rgba(45,212,191,0))]" : ""}`}
                >
                  <span className="font-mono text-sm font-medium">{`Rua ${r.codigo}`}</span>
                  <span className="text-xs text-texto-suave">{`${r.modulos} módulos · ${r.percentual}% ocupada`}</span>
                </button>
              </li>
            ))}
            {lista.length === 0 && <li className="px-3 py-2 text-xs text-texto-suave">Nenhuma rua encontrada.</li>}
          </ul>
          {!termo && ruas.length > 4 && <div className="px-3 pt-1.5 pb-0.5 text-xs text-texto-suave">{`+ ${ruas.length - 4} ruas · digite para filtrar`}</div>}
        </div>
      )}
    </div>
  );
}
