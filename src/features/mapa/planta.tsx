"use client";

// Planta baixa em SVG (quadro "Mapa — planta baixa" do canvas) e base do
// editor. A unidade é a célula de módulo. Também é o desenho de reserva quando
// o computador não tem WebGL.
import type { PointerEvent, Ref } from "react";
import { CORES, type Tema } from "./cores";
import type { Leiaute, ModuloLeiaute } from "./geometria";
import type { ElementoPlanta, Faixa } from "./tipos";

export const PX = 64; // pixels por célula no SVG
export const MARGEM = 44; // espaço para os rótulos das ruas

type Props = {
  leiaute: Leiaute;
  elementos: ElementoPlanta[];
  tema: Tema;
  resumo: string;
  /** Módulo da caixa escolhida (laranja, com o código da caixa). */
  moduloSelecionado?: string | null;
  codigoCaixa?: string | null;
  /** Módulos com destaque vindo da pesquisa. */
  modulosDestacados?: Set<string>;
  faixaDoModulo?: (m: ModuloLeiaute) => Faixa | null;
  onModulo?: (m: ModuloLeiaute) => void;
  /** Editor: rua e elemento escolhidos e arrastos. */
  editor?: {
    ruaSelecionada: string | null;
    elementoSelecionado: string | null;
    onRua(e: PointerEvent, id: string): void;
    onElemento(e: PointerEvent, id: string): void;
    onFundo(e: PointerEvent): void;
    onGirar(id: string): void;
    svgRef: Ref<SVGSVGElement>;
  };
};

const x = (c: number) => MARGEM + c * PX;

export function PlantaSvg({ leiaute, elementos, tema, resumo, moduloSelecionado, codigoCaixa, modulosDestacados, faixaDoModulo, onModulo, editor }: Props) {
  const c = CORES[tema];
  const largura = leiaute.largura * PX + MARGEM * 2;
  const altura = leiaute.profundidade * PX + MARGEM * 2 + 30;
  const e = leiaute.entrada;
  // Faixa da entrada, no lado escolhido, a partir da posição (em células).
  const entrada =
    e.lado === "frente" || e.lado === "fundo"
      ? { x: x(e.posicao), y: e.lado === "frente" ? x(0) - MARGEM + MARGEM + leiaute.profundidade * PX + 6 : MARGEM - 26, w: e.largura * PX, h: 20 }
      : { x: e.lado === "esquerda" ? MARGEM - 26 : MARGEM + leiaute.largura * PX + 6, y: MARGEM + e.posicao * PX, w: 20, h: e.largura * PX };

  return (
    <svg
      ref={editor?.svgRef}
      viewBox={`0 0 ${largura} ${altura}`}
      width="100%"
      role="img"
      aria-label={resumo}
      className="block touch-none select-none"
      onPointerDown={editor?.onFundo}
    >
      <defs>
        <linearGradient id="gA0" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={c.planta.modulo[0]} />
          <stop offset="1" stopColor={c.planta.modulo[1]} />
        </linearGradient>
        <linearGradient id="gA1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={c.planta.modulo[1]} />
          <stop offset="1" stopColor={c.planta.modulo[0]} />
        </linearGradient>
      </defs>

      <rect x={MARGEM} y={MARGEM} width={leiaute.largura * PX} height={leiaute.profundidade * PX} rx="12" fill="none" stroke={c.planta.livreBorda} strokeWidth="2" />
      {editor &&
        Array.from({ length: leiaute.largura + 1 }, (_, i) => (
          <line key={i} x1={x(i)} y1={MARGEM} x2={x(i)} y2={MARGEM + leiaute.profundidade * PX} stroke="rgba(11,46,58,.10)" strokeDasharray="4 4" />
        ))}
      {editor &&
        Array.from({ length: leiaute.profundidade + 1 }, (_, i) => (
          <line key={i} x1={MARGEM} y1={x(i)} x2={MARGEM + leiaute.largura * PX} y2={x(i)} stroke="rgba(11,46,58,.10)" strokeDasharray="4 4" />
        ))}

      {elementos.map((el) => {
        const rotulado = el.rotulo || (el.tipo === "porta" ? "Porta" : null);
        const ehEscolhido = editor?.elementoSelecionado === el.id;
        return (
          <g key={el.id} onPointerDown={editor ? (ev) => editor.onElemento(ev, el.id) : undefined} style={editor ? { cursor: "move" } : undefined}>
            <rect
              x={x(el.x)}
              y={x(el.y)}
              width={el.largura * PX}
              height={el.profundidade * PX}
              rx={el.tipo === "pilar" ? 4 : 6}
              fill={el.tipo === "area" ? "rgba(14,116,144,.10)" : el.tipo === "porta" ? "#f5c542" : c.planta.rotulo}
              stroke={ehEscolhido ? c.selecionada.contorno : el.tipo === "area" ? c.planta.livreBorda : "none"}
              strokeWidth={ehEscolhido ? 3 : 1.5}
              strokeDasharray={el.tipo === "area" ? "6 4" : undefined}
              opacity={el.tipo === "parede" ? 0.85 : 1}
            />
            {rotulado && (el.tipo === "area" || el.tipo === "porta") && (
              <text x={x(el.x) + 6} y={x(el.y) + 16} fontSize="11" fontWeight="600" fill="currentColor" className="text-petroleo dark:text-[#cfe9ee]">
                {rotulado}
              </text>
            )}
          </g>
        );
      })}

      {leiaute.ruas.map((r) => {
        const rx = x(r.x);
        const ry = x(r.y);
        const horizontal = r.w >= r.h;
        const escolhida = editor?.ruaSelecionada === r.id;
        const erro = r.problema !== null;
        const rotuloX = horizontal ? rx - 36 : rx + (r.w * PX) / 2 - 17;
        const rotuloY = horizontal ? ry + (r.h * PX) / 2 - 13 : ry - 32;
        return (
          <g key={r.id} data-rua={r.codigo}>
            <rect
              x={rx}
              y={ry}
              width={r.w * PX}
              height={r.h * PX}
              rx="10"
              fill={c.planta.rua}
              opacity={0.92}
              stroke={erro ? "#d14343" : escolhida ? c.selecionada.contorno : "none"}
              strokeWidth={erro || escolhida ? 3 : 0}
              strokeDasharray={erro ? "6 4" : undefined}
              onPointerDown={editor ? (ev) => editor.onRua(ev, r.id) : undefined}
              style={editor ? { cursor: "move" } : undefined}
            />
            {leiaute.modulos
              .filter((m) => m.ruaId === r.id)
              .map((m) => {
                const cx = x(m.x + m.w / 2);
                const cy = x(m.y + m.h / 2);
                const sel = moduloSelecionado === m.id;
                const destacado = modulosDestacados?.has(m.id);
                const faixa = faixaDoModulo?.(m) ?? null;
                const vazio = !editor && m.caixas === 0;
                const alternado = m.numero % 2 === 0 ? "url(#gA0)" : "url(#gA1)";
                const preenchimento = sel ? c.selecionada.frente : vazio ? c.planta.livre : faixa !== null ? c.ocupacao[faixa] : alternado;
                const interativo = !!onModulo && !editor && !vazio;
                return (
                  <g
                    key={m.id}
                    data-modulo={`${r.codigo}-M${m.numero}`}
                    role={interativo ? "button" : undefined}
                    tabIndex={interativo ? 0 : undefined}
                    aria-label={interativo ? `Rua ${r.codigo}, módulo ${m.numero}, ${m.caixas} caixas` : undefined}
                    onClick={interativo ? () => onModulo?.(m) : undefined}
                    onKeyDown={interativo ? (ev) => (ev.key === "Enter" || ev.key === " ") && (ev.preventDefault(), onModulo?.(m)) : undefined}
                    style={interativo ? { cursor: "pointer" } : undefined}
                    className="outline-none focus-visible:[&>rect]:stroke-[#0e7490] focus-visible:[&>rect]:stroke-[3]"
                    pointerEvents={editor ? "none" : undefined}
                  >
                    <rect
                      x={cx - 26}
                      y={cy - 26}
                      width="52"
                      height="52"
                      rx="8"
                      fill={preenchimento}
                      stroke={sel ? c.selecionada.contorno : vazio ? c.planta.livreBorda : destacado ? c.selecionada.contorno : "none"}
                      strokeWidth={sel ? 2 : destacado ? 3 : 1}
                      strokeDasharray={vazio ? "4 3" : undefined}
                    />
                    {!vazio && !sel && <rect x={cx - 20} y={cy - 20} width="40" height="5" rx="2" fill="#fff" opacity=".55" />}
                    {sel && codigoCaixa && (
                      <text x={cx} y={cy + 5} textAnchor="middle" fontFamily="var(--font-mono), monospace" fontWeight="600" fontSize="12" fill="#0b2e3a">
                        {codigoCaixa}
                      </text>
                    )}
                    {!sel && !editor && (
                      <text x={cx} y={cy + 20} textAnchor="middle" fontFamily="var(--font-mono), monospace" fontSize="9" fill="#fff" opacity={vazio ? 0 : 0.9}>
                        M{m.numero}
                      </text>
                    )}
                    {vazio && !editor && (
                      <text x={cx} y={cy + 4} textAnchor="middle" fontSize="8.5" fill="currentColor" className="text-texto-suave">
                        Posição livre
                      </text>
                    )}
                  </g>
                );
              })}
            <g pointerEvents="none">
              <rect x={rotuloX} y={rotuloY} width="34" height="26" rx="8" fill={erro ? "#d14343" : c.planta.rotulo} />
              <text x={rotuloX + 17} y={rotuloY + 18} textAnchor="middle" fontFamily="var(--font-mono), monospace" fontWeight="500" fontSize="13" fill={c.planta.rotuloTexto}>
                {r.codigo}
              </text>
            </g>
            {escolhida && editor && (
              <g
                role="button"
                aria-label={`Girar a Rua ${r.codigo} em 90 graus`}
                tabIndex={0}
                style={{ cursor: "pointer" }}
                onPointerDown={(ev) => ev.stopPropagation()}
                onClick={() => editor.onGirar(r.id)}
                onKeyDown={(ev) => (ev.key === "Enter" || ev.key === " ") && (ev.preventDefault(), editor.onGirar(r.id))}
              >
                <circle cx={rx + r.w * PX} cy={ry} r="13" fill="#ff9f1c" />
                <path d={`M ${rx + r.w * PX - 5} ${ry + 2} a 5 5 0 1 1 3 4 M ${rx + r.w * PX + 3} ${ry - 3} l 0 5 l -5 0`} stroke="#0b2e3a" strokeWidth="1.6" fill="none" />
              </g>
            )}
            {erro && (
              <text x={rx + 6} y={ry + r.h * PX + 14} fontSize="11" fontWeight="600" fill="#d14343">
                {r.problema === "fora" ? "Passa da parede" : `Sobre a Rua ${r.sobrepoeCom}`}
              </text>
            )}
          </g>
        );
      })}

      <g pointerEvents="none">
        <rect x={entrada.x} y={entrada.y} width={entrada.w} height={entrada.h} rx="7" fill={c.planta.rotulo} />
        <text
          x={entrada.x + entrada.w / 2}
          y={entrada.y + entrada.h / 2 + 4}
          textAnchor="middle"
          fontSize="10"
          fontWeight="600"
          letterSpacing=".06em"
          fill={c.planta.rotuloTexto}
          transform={e.lado === "esquerda" || e.lado === "direita" ? `rotate(-90 ${entrada.x + entrada.w / 2} ${entrada.y + entrada.h / 2})` : undefined}
        >
          {editor ? "ENTRADA" : "ENTRADA DO GALPÃO"}
        </text>
      </g>
    </svg>
  );
}
