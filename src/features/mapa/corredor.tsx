"use client";

// Corredor: a vista de frente da rua da caixa escolhida (a mesma ideia da
// "Vista de frente" da Fase 2), com a caixa em laranja e cada caixa clicável.
import type { Tema } from "./cores";
import { CORES } from "./cores";
import type { NoRua } from "./arvore";

const LARG = 22;
const ALT = 34;
const PASSO = 26;
const PASSO_NIVEL = 58;

export function Corredor({ rua, tema, selecionada, onSelecionar }: { rua: NoRua | undefined; tema: Tema; selecionada: string | null; onSelecionar(id: string): void }) {
  if (!rua) return <p className="p-6 text-sm text-texto-suave">Escolha uma caixa para ver o corredor da rua dela.</p>;
  const c = CORES[tema];
  const niveis = Math.max(1, ...rua.modulos.map((m) => m.niveis.length));
  const colunas = Math.max(4, ...rua.modulos.flatMap((m) => m.niveis.map((n) => Math.max(0, ...n.caixas.map((x) => x.numero)))));
  const larguraModulo = colunas * PASSO + 20;
  const largura = 40 + rua.modulos.length * (larguraModulo + 8);
  const altura = 50 + niveis * PASSO_NIVEL;
  return (
    <svg viewBox={`0 0 ${largura} ${altura}`} width="100%" role="group" aria-label={`Corredor da Rua ${rua.codigo}`} className="block lg:h-full lg:w-full">
      <text x="8" y="24" fontFamily="var(--font-mono), monospace" fontWeight="600" fontSize="14" fill="currentColor">
        Rua {rua.codigo}
      </text>
      {rua.modulos.map((m, mi) => {
        const x0 = 20 + mi * (larguraModulo + 8);
        return (
          <g key={m.id}>
            <text x={x0} y="44" fontSize="11" fill="currentColor" className="text-texto-suave">
              Módulo {m.numero}
            </text>
            {[...m.niveis].reverse().map((n, ni) => {
              const y = 50 + ni * PASSO_NIVEL;
              return (
                <g key={n.id}>
                  <rect x={x0} y={y + ALT + 6} width={larguraModulo} height="5" rx="2" fill={c.estante.frente} />
                  {n.caixas.map((x) => {
                    const sel = x.id === selecionada;
                    return (
                      <g
                        key={x.id}
                        role="button"
                        tabIndex={0}
                        aria-label={`Caixa ${x.codigo}`}
                        aria-pressed={sel}
                        style={{ cursor: "pointer" }}
                        className="outline-none focus-visible:[&>rect]:stroke-[#0e7490] focus-visible:[&>rect]:stroke-[3]"
                        onClick={() => onSelecionar(x.id)}
                        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onSelecionar(x.id))}
                      >
                        <rect
                          x={x0 + 10 + (x.numero - 1) * PASSO}
                          y={y + 4}
                          width={LARG}
                          height={ALT}
                          rx="4"
                          fill={sel ? c.selecionada.frente : c.caixa.frente}
                          stroke={sel ? c.selecionada.contorno : "none"}
                          strokeWidth="2"
                        />
                        <text x={x0 + 10 + (x.numero - 1) * PASSO + LARG / 2} y={y + 26} textAnchor="middle" fontSize="9" fontWeight="600" fill="#0b2e3a">
                          {String(x.numero).padStart(2, "0")}
                        </text>
                      </g>
                    );
                  })}
                  <text x={x0 - 14} y={y + 26} fontSize="9" fill="currentColor" className="text-texto-suave">
                    N{n.numero}
                  </text>
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}
