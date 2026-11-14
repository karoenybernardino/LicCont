import Link from "next/link";
import type { Modulo, Nivel } from "./ocupacao";
import { codigoPosicao } from "./ocupacao";

// "Vista de frente" da rua (canvas RuaDetalhe): uma estante por módulo, uma
// prateleira por nível e uma caixa por posição. Cada caixa leva ao seu nível.
const LARG_CAIXA = 29;
const PASSO = 33;
const ALT_CAIXA = 48;
const PASSO_NIVEL = 74;

export function VistaFrente({
  rua,
  ruaId,
  modulos,
  niveis,
  caixas,
  selecionado,
}: {
  rua: string;
  ruaId: string;
  modulos: Modulo[];
  niveis: Nivel[];
  /** Números das caixas ativas de cada nível. */
  caixas: Map<string, number[]>;
  selecionado?: string;
}) {
  const ativos = modulos.filter((m) => m.ativo);
  const nNiveis = Math.max(1, ...ativos.map((m) => niveis.filter((n) => n.moduloId === m.id && n.ativo).length));
  const slots = Math.max(4, ...niveis.filter((n) => n.ativo).map((n) => n.capacidade));
  const larg = 14 + PASSO * slots;
  const pitch = larg + 2;
  const base = 100 + PASSO_NIVEL * (nNiveis - 1); // y da prateleira de baixo
  const altura = base + 38;
  const largura = 43 + ativos.length * pitch + 20;

  return (
    <svg
      viewBox={`0 0 ${largura} ${altura}`}
      width="100%"
      className="block"
      role="group"
      aria-label={`Vista de frente da Rua ${rua}`}
    >
      <defs>
        <linearGradient id="gbox-c" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5eead4" />
          <stop offset="1" stopColor="#0e7490" />
        </linearGradient>
        <linearGradient id="gbox-e" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2dd4bf" />
          <stop offset="1" stopColor="#0f766e" />
        </linearGradient>
        <linearGradient id="gsel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffd27a" />
          <stop offset="1" stopColor="#ff9f1c" />
        </linearGradient>
      </defs>
      {ativos.map((m, mi) => {
        const x0 = 43 + mi * pitch;
        const lista = niveis.filter((n) => n.moduloId === m.id && n.ativo).sort((a, b) => a.numero - b.numero);
        return (
          <g key={m.id}>
            <text
              x={x0 + (larg - 4) / 2}
              y={18}
              textAnchor="middle"
              className="fill-texto-suave font-mono text-xs font-medium"
            >
              M{m.numero}
            </text>
            <rect x={x0} y={30} width={4} height={base + 10 - 30} className="fill-[#7fa6ae] dark:fill-[#3b5d66]" />
            <rect x={x0 + larg - 4} y={30} width={4} height={base + 10 - 30} className="fill-[#7fa6ae] dark:fill-[#3b5d66]" />
            {lista.map((n, i) => {
              const ys = base - PASSO_NIVEL * i;
              const ativo = n.id === selecionado;
              const existentes = caixas.get(n.id) ?? [];
              return (
                <g key={n.id}>
                  <rect x={x0} y={ys} width={larg} height={5} className="fill-[#9fbfc6] dark:fill-[#2a4a52]" />
                  {Array.from({ length: n.capacidade }, (_, c) => {
                    const x = x0 + 8 + PASSO * c;
                    const y = ys - 52;
                    const numero = c + 1;
                    if (!existentes.includes(numero)) {
                      return (
                        <rect
                          key={c}
                          x={x}
                          y={y}
                          width={LARG_CAIXA}
                          height={ALT_CAIXA}
                          rx={3}
                          fill="none"
                          strokeDasharray="3 3"
                          className="stroke-[#7fa6ae] dark:stroke-[#1b3a44]"
                        />
                      );
                    }
                    const codigo = codigoPosicao(rua, m.numero, n.numero, numero);
                    return (
                      <Link
                        key={c}
                        href={`/estrutura/rua/${ruaId}?nivel=${n.id}#nivel`}
                        aria-label={codigo}
                      >
                        <rect
                          x={x}
                          y={y}
                          width={LARG_CAIXA}
                          height={ALT_CAIXA}
                          rx={3}
                          className={
                            ativo
                              ? "fill-[url(#gsel)] stroke-[#f59e0b]"
                              : "fill-[url(#gbox-c)] stroke-[#0f766e] dark:fill-[url(#gbox-e)] dark:stroke-[#14b8a6]"
                          }
                        />
                        <rect x={x + 6} y={y + 8} width={17} height={9} rx={1.5} className="fill-[#f0fdfa] opacity-90 dark:fill-[#0b2e3a]" />
                        <text
                          x={x + LARG_CAIXA / 2}
                          y={y + 15}
                          textAnchor="middle"
                          className="fill-[#0f766e] font-mono text-[6.5px] font-medium dark:fill-[#7ff0df]"
                        >
                          C{String(numero).padStart(2, "0")}
                        </text>
                      </Link>
                    );
                  })}
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}

export function LegendaFrente() {
  const item = "inline-flex items-center gap-1.5 text-xs text-texto-suave";
  return (
    <div className="flex flex-wrap gap-4">
      <span className={item}>
        <span className="h-4 w-3 rounded-sm bg-[linear-gradient(#5eead4,#0e7490)] dark:bg-[linear-gradient(#2dd4bf,#0f766e)]" />
        Ocupada
      </span>
      <span className={item}>
        <span className="h-4 w-3 rounded-sm border border-dashed border-[#7fa6ae] dark:border-[#1b3a44]" />
        Posição livre
      </span>
      <span className={item}>
        <span className="h-4 w-3 rounded-sm bg-[linear-gradient(#ffd27a,#ff9f1c)]" />
        Nível selecionado
      </span>
    </div>
  );
}
