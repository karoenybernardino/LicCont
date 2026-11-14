"use client";

// "Ver em lista": a árvore Rua > Módulo > Nível > Caixa em HTML. É o caminho
// de quem usa teclado ou leitor de tela, e escolher aqui é o mesmo que clicar
// no 3D. Só desenha o que está aberto (galpão grande tem milhares de caixas).
import { useState } from "react";
import type { NoRua } from "./arvore";
import { estilos } from "./painel-caixa";

const resumo = `cursor-pointer rounded px-1.5 py-1 text-[13px] font-medium hover:bg-superficie-2 ${estilos.foco}`;

export function ListaCaixas({ arvore, selecionada, onSelecionar }: { arvore: NoRua[]; selecionada: string | null; onSelecionar(id: string): void }) {
  const [abertos, setAbertos] = useState<Set<string>>(new Set());
  const alternar = (k: string, aberto: boolean) =>
    setAbertos((a) => {
      const n = new Set(a);
      if (aberto) n.add(k);
      else n.delete(k);
      return n;
    });
  const aberto = (k: string, contem: boolean) => abertos.has(k) || (contem && !abertos.has(`-${k}`));

  return (
    <section aria-label="Lista de caixas" className={estilos.cartao}>
      <h2 className="font-titulo text-[15px] font-bold">Lista de caixas</h2>
      <div className="sc flex max-h-[420px] flex-col gap-1 overflow-y-auto pr-1">
        {arvore.map((r) => {
          const kr = `r${r.id}`;
          const temSel = r.modulos.some((m) => m.niveis.some((n) => n.caixas.some((c) => c.id === selecionada)));
          return (
            <details key={r.id} open={aberto(kr, temSel)} onToggle={(e) => alternar(kr, e.currentTarget.open)}>
              <summary className={resumo}>Rua {r.codigo}</summary>
              {aberto(kr, temSel) && (
                <div className="ml-3 flex flex-col gap-1 border-l border-linha pl-2">
                  {r.modulos.map((m) => {
                    const km = `m${m.id}`;
                    const contem = m.niveis.some((n) => n.caixas.some((c) => c.id === selecionada));
                    return (
                      <details key={m.id} open={aberto(km, contem)} onToggle={(e) => alternar(km, e.currentTarget.open)}>
                        <summary className={resumo}>Módulo {m.numero}</summary>
                        {aberto(km, contem) && (
                          <ul className="ml-3 flex flex-col gap-1.5 border-l border-linha py-1 pl-2">
                            {[...m.niveis].reverse().map((n) => (
                              <li key={n.id} className="flex flex-wrap items-center gap-1.5">
                                <span className="w-14 text-xs text-texto-suave">Nível {n.numero}</span>
                                {n.caixas.length === 0 && <span className="text-xs text-texto-suave">sem caixas</span>}
                                {n.caixas.map((c) => (
                                  <button
                                    key={c.id}
                                    type="button"
                                    aria-pressed={c.id === selecionada}
                                    aria-label={`${String(c.numero).padStart(2, "0")}, caixa ${c.codigo}`}
                                    onClick={() => onSelecionar(c.id)}
                                    className={`min-h-8 min-w-9 rounded-md border px-1.5 font-mono text-xs max-md:min-h-11 max-md:min-w-11 ${estilos.foco} ${
                                      c.id === selecionada ? "border-[#d97706] bg-[#ff9f1c] font-semibold text-[#0b2e3a]" : "border-linha bg-superficie-2 hover:border-destaque"
                                    }`}
                                  >
                                    {String(c.numero).padStart(2, "0")}
                                  </button>
                                ))}
                              </li>
                            ))}
                          </ul>
                        )}
                      </details>
                    );
                  })}
                </div>
              )}
            </details>
          );
        })}
      </div>
    </section>
  );
}
