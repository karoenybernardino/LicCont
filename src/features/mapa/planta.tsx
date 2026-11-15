"use client";

// Planta baixa em SVG (quadro "Mapa — planta baixa" do canvas) e base do
// editor. A unidade é a célula de módulo; as medidas na tela saem em metros
// (célula × metros por célula). Também é o desenho de reserva quando o
// computador não tem WebGL.
//
// Paredes, pilares e portas seguem o quadro do editor: parede é uma linha
// clara, pilar um quadradinho, porta uma abertura com o arco da folha e a
// entrada do galpão um traço laranja tracejado. As estantes (ruas) são barras
// em degradê, para nunca se confundirem com a construção.
import type { PointerEvent, Ref } from "react";
import { CORES, type Tema } from "./cores";
import type { Leiaute, ModuloLeiaute } from "./geometria";
import { FAIXAS, formatarMetros, type ElementoPlanta, type Faixa } from "./tipos";

export const PX = 64; // pixels por célula no SVG
export const MARGEM = 52; // espaço para os rótulos e as cotas

type Props = {
  leiaute: Leiaute;
  elementos: ElementoPlanta[];
  tema: Tema;
  resumo: string;
  /** Metros por célula, para as cotas ("26 m"). */
  metrosCelula: number;
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
    /** Arrastar o traço da entrada para outra parede. */
    onEntrada(e: PointerEvent): void;
    /** Arrastar a ponta da rua (só administrador): mais ou menos módulos. */
    onPontaRua?(e: PointerEvent, id: string): void;
    /** Parede em desenho (prévia), em células. */
    previa?: { x: number; y: number; largura: number; profundidade: number; n?: number; vertical?: boolean; tira?: boolean; rotulo?: string } | null;
    svgRef: Ref<SVGSVGElement>;
  };
};

const x = (c: number) => MARGEM + c * PX;
const LARANJA = "#ff9f1c";
const ERRO = "#d14343";

// Porta: abertura na parede, folha aberta e arco tracejado. A folha abre para
// dentro do galpão (o lado do centro).
function Porta({ el, largura, profundidade, c, fundo, escolhido }: { el: ElementoPlanta; fundo: string; largura: number; profundidade: number; c: (typeof CORES)["claro"]["planta"]; escolhido: boolean }) {
  const x0 = x(el.x);
  const y0 = x(el.y);
  const w = el.largura * PX;
  const h = el.profundidade * PX;
  const vertical = h > w;
  const cor = escolhido ? LARANJA : c.parede;
  let folha: string;
  let arco: string;
  if (vertical) {
    const cx = x0 + w / 2;
    const sx = el.x + el.largura / 2 < largura / 2 ? 1 : -1;
    const dobradica = [cx, y0 + h];
    const aberta = [cx + sx * h, y0 + h];
    folha = `M ${dobradica[0]} ${dobradica[1]} L ${aberta[0]} ${aberta[1]}`;
    arco = `M ${cx} ${y0} A ${h} ${h} 0 0 ${sx > 0 ? 1 : 0} ${aberta[0]} ${aberta[1]}`;
  } else {
    const cy = y0 + h / 2;
    const sy = el.y + el.profundidade / 2 < profundidade / 2 ? 1 : -1;
    const aberta = [x0, cy + sy * w];
    folha = `M ${x0} ${cy} L ${aberta[0]} ${aberta[1]}`;
    arco = `M ${x0 + w} ${cy} A ${w} ${w} 0 0 ${sy > 0 ? 1 : 0} ${aberta[0]} ${aberta[1]}`;
  }
  return (
    <g>
      {/* A abertura apaga o pedaço de parede que ela ocupa. */}
      <rect x={x0} y={y0} width={w} height={h} fill={fundo} />
      <path d={folha} stroke={cor} strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d={arco} stroke={cor} strokeWidth="1.5" strokeDasharray="5 4" fill="none" opacity=".8" />
    </g>
  );
}

// Janela: vão na parede com duas linhas e o vidro no meio.
function Janela({ el, fundo, c, escolhido }: { el: ElementoPlanta; fundo: string; c: (typeof CORES)["claro"]["planta"]; escolhido: boolean }) {
  const x0 = x(el.x);
  const y0 = x(el.y);
  const w = el.largura * PX;
  const h = el.profundidade * PX;
  const cor = escolhido ? LARANJA : c.parede;
  const vertical = h > w;
  const t = 5;
  return (
    <g>
      <rect x={x0} y={y0} width={w} height={h} fill={fundo} />
      {vertical ? (
        <>
          <line x1={x0 + w / 2 - t} y1={y0} x2={x0 + w / 2 - t} y2={y0 + h} stroke={cor} strokeWidth="2" />
          <line x1={x0 + w / 2 + t} y1={y0} x2={x0 + w / 2 + t} y2={y0 + h} stroke={cor} strokeWidth="2" />
          <line x1={x0 + w / 2} y1={y0} x2={x0 + w / 2} y2={y0 + h} stroke="#38bdf8" strokeWidth="2" />
        </>
      ) : (
        <>
          <line x1={x0} y1={y0 + h / 2 - t} x2={x0 + w} y2={y0 + h / 2 - t} stroke={cor} strokeWidth="2" />
          <line x1={x0} y1={y0 + h / 2 + t} x2={x0 + w} y2={y0 + h / 2 + t} stroke={cor} strokeWidth="2" />
          <line x1={x0} y1={y0 + h / 2} x2={x0 + w} y2={y0 + h / 2} stroke="#38bdf8" strokeWidth="2" />
        </>
      )}
    </g>
  );
}

export function PlantaSvg({ leiaute, elementos, tema, resumo, metrosCelula, moduloSelecionado, codigoCaixa, modulosDestacados, faixaDoModulo, onModulo, editor }: Props) {
  const c = CORES[tema];
  const p = c.planta;
  const largura = leiaute.largura * PX + MARGEM * 2;
  const altura = leiaute.profundidade * PX + MARGEM * 2 + 30;
  const e = leiaute.entrada;
  const W = leiaute.largura * PX;
  const H = leiaute.profundidade * PX;

  // Traço da entrada, em cima da parede do lado escolhido, e onde vai o texto.
  const larguraEntrada = e.largura * PX;
  const entrada =
    e.lado === "frente"
      ? { x1: x(e.posicao), y1: MARGEM + H, x2: x(e.posicao) + larguraEntrada, y2: MARGEM + H, tx: x(e.posicao) + larguraEntrada / 2, ty: MARGEM + H + 26, giro: false }
      : e.lado === "fundo"
        ? { x1: x(e.posicao), y1: MARGEM, x2: x(e.posicao) + larguraEntrada, y2: MARGEM, tx: x(e.posicao) + larguraEntrada / 2, ty: MARGEM - 14, giro: false }
        : e.lado === "esquerda"
          ? { x1: MARGEM, y1: x(e.posicao), x2: MARGEM, y2: x(e.posicao) + larguraEntrada, tx: MARGEM - 14, ty: x(e.posicao) + larguraEntrada / 2, giro: true }
          : { x1: MARGEM + W, y1: x(e.posicao), x2: MARGEM + W, y2: x(e.posicao) + larguraEntrada, tx: MARGEM + W + 26, ty: x(e.posicao) + larguraEntrada / 2, giro: true };

  return (
    <svg
      ref={editor?.svgRef}
      viewBox={`0 0 ${largura} ${altura}`}
      width="100%"
      role={onModulo || editor ? "group" : "img"}
      aria-label={resumo}
      className={editor ? "block touch-none select-none" : "block select-none lg:h-full lg:w-full"}
      onPointerDown={editor?.onFundo}
    >
      <defs>
        <linearGradient id="gA0" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={p.modulo[0]} />
          <stop offset="1" stopColor={p.modulo[1]} />
        </linearGradient>
        <linearGradient id="gA1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={p.modulo[1]} />
          <stop offset="1" stopColor={p.modulo[0]} />
        </linearGradient>
        <pattern id="listras" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="8" stroke={p.parede} strokeWidth="1" opacity=".22" />
        </pattern>
      </defs>

      {/* Chão do galpão: no editor, escuro e com a grade das células. */}
      {editor && <rect x={MARGEM} y={MARGEM} width={W} height={H} rx="6" fill={p.editor} />}
      {editor &&
        Array.from({ length: leiaute.largura + 1 }, (_, i) => <line key={`gx${i}`} x1={x(i)} y1={MARGEM} x2={x(i)} y2={MARGEM + H} stroke={p.grade} />)}
      {editor &&
        Array.from({ length: leiaute.profundidade + 1 }, (_, i) => <line key={`gy${i}`} x1={MARGEM} y1={x(i)} x2={MARGEM + W} y2={x(i)} stroke={p.grade} />)}

      {/* Cotas: 0 no canto e a largura e a profundidade em metros. */}
      <g fontFamily="var(--font-mono), monospace" fontSize="17" fill={p.cota} pointerEvents="none">
        <text x={MARGEM} y={MARGEM - 14}>0</text>
        <text x={MARGEM + W} y={MARGEM - 14} textAnchor="end">{formatarMetros(leiaute.largura * metrosCelula)}</text>
        <text x={MARGEM - 16} y={MARGEM + H} textAnchor="start" transform={`rotate(-90 ${MARGEM - 16} ${MARGEM + H})`}>{formatarMetros(leiaute.profundidade * metrosCelula)}</text>
      </g>

      {/* Parede externa */}
      <rect x={MARGEM} y={MARGEM} width={W} height={H} rx="4" fill="none" stroke={p.parede} strokeWidth="3.5" />

      {/* Construção: paredes internas, pilares, áreas e portas. */}
      {elementos
        .filter((el) => el.tipo !== "porta" && el.tipo !== "janela")
        .map((el) => {
          const escolhido = editor?.elementoSelecionado === el.id;
          const cx = x(el.x);
          const cy = x(el.y);
          const w = el.largura * PX;
          const h = el.profundidade * PX;
          return (
            <g key={el.id} onPointerDown={editor ? (ev) => editor.onElemento(ev, el.id) : undefined} style={editor ? { cursor: "move" } : undefined}>
              <rect x={cx} y={cy} width={w} height={h} fill="transparent" />
              {el.tipo === "parede" &&
                (w >= h ? (
                  <rect x={cx} y={cy + h / 2 - 2} width={w} height="4" rx="2" fill={escolhido ? LARANJA : p.parede} />
                ) : (
                  <rect x={cx + w / 2 - 2} y={cy} width="4" height={h} rx="2" fill={escolhido ? LARANJA : p.parede} />
                ))}
              {el.tipo === "pilar" && <rect x={cx + w / 2 - 7} y={cy + h / 2 - 7} width="14" height="14" rx="2" fill={escolhido ? LARANJA : p.pilar} />}
              {el.tipo === "area" && (
                <>
                  <rect x={cx} y={cy} width={w} height={h} rx="4" fill="url(#listras)" stroke={escolhido ? LARANJA : p.parede} strokeWidth={escolhido ? 2.5 : 1.5} strokeDasharray="6 4" opacity={escolhido ? 1 : 0.9} />
                  {el.rotulo && (
                    <text x={cx + w / 2} y={cy + h / 2 + 4} textAnchor="middle" fontSize="17" fontWeight="600" fill="currentColor" className="text-petroleo dark:text-[#cfe9ee]">
                      {el.rotulo}
                    </text>
                  )}
                </>
              )}
              {escolhido && el.tipo !== "area" && <rect x={cx} y={cy} width={w} height={h} rx="4" fill="none" stroke={LARANJA} strokeWidth="1.5" strokeDasharray="4 3" />}
            </g>
          );
        })}

      {/* Ruas (estantes): barras em degradê; no editor, com a divisão dos módulos. */}
      {leiaute.ruas.map((r) => {
        const rx = x(r.x);
        const ry = x(r.y);
        const horizontal = r.w >= r.h;
        const escolhida = editor?.ruaSelecionada === r.id;
        const erro = r.problema !== null;
        const rw = r.w * PX;
        const rh = r.h * PX;
        const rotuloX = horizontal ? rx - 36 : rx + rw / 2 - 17;
        const rotuloY = horizontal ? ry + rh / 2 - 13 : ry - 32;
        return (
          <g key={r.id} data-rua={r.codigo}>
            {editor ? (
              <g onPointerDown={(ev) => editor.onRua(ev, r.id)} style={{ cursor: "move" }}>
                <rect x={rx + 3} y={ry + 3} width={rw - 6} height={rh - 6} rx="6" fill="url(#gA0)" opacity={erro ? 0.55 : 0.95} />
                {Array.from({ length: Math.max(0, r.modulos - 1) }, (_, i) => {
                  const f = (i + 1) / r.modulos;
                  return horizontal ? (
                    <line key={i} x1={rx + rw * f} y1={ry + 5} x2={rx + rw * f} y2={ry + rh - 5} stroke="#fff" strokeOpacity=".45" />
                  ) : (
                    <line key={i} x1={rx + 5} y1={ry + rh * f} x2={rx + rw - 5} y2={ry + rh * f} stroke="#fff" strokeOpacity=".45" />
                  );
                })}
                <rect x={rx + 1} y={ry + 1} width={rw - 2} height={rh - 2} rx="8" fill="none" stroke={erro ? ERRO : escolhida ? LARANJA : "none"} strokeWidth={escolhida || erro ? 2.5 : 0} strokeDasharray={erro && !escolhida ? "6 4" : undefined} />
                <g pointerEvents="none">
                  <circle cx={rx + 22} cy={ry + 22} r="15" fill={erro ? ERRO : "#0b2e3a"} stroke="#fff" strokeOpacity=".5" />
                  <text x={rx + 22} y={ry + 27.5} textAnchor="middle" fontFamily="var(--font-mono), monospace" fontWeight="700" fontSize="16" fill="#fff">
                    {r.codigo}
                  </text>
                </g>
              </g>
            ) : (
              <rect x={rx} y={ry} width={rw} height={rh} rx="10" fill={p.rua} opacity={0.92} stroke={erro ? ERRO : "none"} strokeWidth={erro ? 3 : 0} strokeDasharray={erro ? "6 4" : undefined} />
            )}

            {!editor &&
              leiaute.modulos
                .filter((m) => m.ruaId === r.id)
                .map((m) => {
                  const cx = x(m.x + m.w / 2);
                  const cy = x(m.y + m.h / 2);
                  const sel = moduloSelecionado === m.id;
                  const destacado = modulosDestacados?.has(m.id);
                  const faixa = faixaDoModulo?.(m) ?? null;
                  const vazio = m.caixas === 0;
                  const alternado = m.numero % 2 === 0 ? "url(#gA0)" : "url(#gA1)";
                  const preenchimento = sel ? c.selecionada.frente : vazio ? p.livre : faixa !== null ? c.ocupacao[faixa] : alternado;
                  const interativo = !!onModulo && !vazio;
                  return (
                    <g
                      key={m.id}
                      data-modulo={`${r.codigo}-M${m.numero}`}
                      role={interativo ? "button" : undefined}
                      tabIndex={interativo ? 0 : undefined}
                      aria-label={interativo ? `${sel && codigoCaixa ? codigoCaixa : `M${m.numero}`}, Rua ${r.codigo}, módulo ${m.numero}, ${m.caixas} caixas${faixa !== null ? `, ocupação ${FAIXAS.find((f) => f.faixa === faixa)?.rotulo ?? ""}` : ""}` : undefined}
                      onClick={interativo ? () => onModulo?.(m) : undefined}
                      onKeyDown={interativo ? (ev) => (ev.key === "Enter" || ev.key === " ") && (ev.preventDefault(), onModulo?.(m)) : undefined}
                      style={interativo ? { cursor: "pointer" } : undefined}
                      className="outline-none focus-visible:[&>rect]:stroke-foco focus-visible:[&>rect]:stroke-[3]"
                    >
                      <rect
                        x={cx - 26}
                        y={cy - 26}
                        width="52"
                        height="52"
                        rx="8"
                        fill={preenchimento}
                        stroke={sel ? c.selecionada.contorno : vazio ? p.livreBorda : destacado ? c.selecionada.contorno : "none"}
                        strokeWidth={sel ? 2 : destacado ? 3 : 1}
                        strokeDasharray={vazio ? "4 3" : undefined}
                      />
                      {!vazio && !sel && <rect x={cx - 20} y={cy - 20} width="40" height="5" rx="2" fill="#fff" opacity=".55" />}
                      {sel && codigoCaixa && (
                        <text x={cx} y={cy + 5} textAnchor="middle" fontFamily="var(--font-mono), monospace" fontWeight="600" fontSize="12" fill="#0b2e3a">
                          {codigoCaixa}
                        </text>
                      )}
                      {!sel && (
                        <text x={cx} y={cy + 20} textAnchor="middle" fontFamily="var(--font-mono), monospace" fontSize="11" fontWeight="600" fill="#0b2e3a" opacity={vazio ? 0 : 1}>
                          M{m.numero}
                        </text>
                      )}
                      {vazio && (
                        <text x={cx} y={cy + 4} textAnchor="middle" fontSize="8.5" fill="currentColor" className="text-texto-suave">
                          Posição livre
                        </text>
                      )}
                    </g>
                  );
                })}

            {!editor && (
              <g pointerEvents="none">
                <rect x={rotuloX} y={rotuloY} width="34" height="26" rx="8" fill={erro ? ERRO : p.rotulo} />
                <text x={rotuloX + 17} y={rotuloY + 18} textAnchor="middle" fontFamily="var(--font-mono), monospace" fontWeight="500" fontSize="13" fill={p.rotuloTexto}>
                  {r.codigo}
                </text>
              </g>
            )}

            {/* Ponta da rua: faixa laranja larga (sempre à vista na rua escolhida); puxar abre ou fecha módulos. */}
            {editor?.onPontaRua && (() => {
              const v = r.giro === 90 || r.giro === 270;
              const fx = v ? rx : rx + rw - 8;
              const fy = v ? ry + rh - 8 : ry;
              return (
                <g
                  role="presentation"
                  data-ponta-rua={r.codigo}
                  className="group/ponta"
                  style={{ cursor: v ? "ns-resize" : "ew-resize", touchAction: "none" }}
                  onPointerDown={(ev) => editor.onPontaRua?.(ev, r.id)}
                >
                  <rect x={fx - (v ? 0 : 12)} y={fy - (v ? 12 : 0)} width={v ? rw : 32} height={v ? 32 : rh} fill="transparent" />
                  <rect x={fx} y={fy} width={v ? rw : 8} height={v ? 8 : rh} rx="3" fill={LARANJA} className={`transition-opacity group-hover/ponta:opacity-100 ${escolhida ? "opacity-90" : "opacity-0"}`} pointerEvents="none" />
                </g>
              );
            })()}

            {/* Rua escolhida no editor: quatro alças nos cantos e o botão de girar. */}
            {escolhida && editor && (
              <g>
                {[
                  [rx, ry],
                  [rx + rw, ry],
                  [rx, ry + rh],
                  [rx + rw, ry + rh],
                ].map(([hx, hy], i) => (
                  <rect key={i} x={hx - 6} y={hy - 6} width="12" height="12" rx="1.5" fill="#fff" stroke={LARANJA} strokeWidth="1.5" pointerEvents="none" />
                ))}
                <g
                  role="button"
                  aria-label={`Girar a Rua ${r.codigo} em 90 graus`}
                  tabIndex={0}
                  style={{ cursor: "pointer" }}
                  className="outline-none focus-visible:[&>circle]:stroke-foco focus-visible:[&>circle]:stroke-[3]"
                  onPointerDown={(ev) => ev.stopPropagation()}
                  onClick={() => editor.onGirar(r.id)}
                  onKeyDown={(ev) => (ev.key === "Enter" || ev.key === " ") && (ev.preventDefault(), editor.onGirar(r.id))}
                >
                  <g transform={`translate(${rx + rw + 24} ${ry - 20})`}>
                    <circle r="17" fill={LARANJA} />
                    <path d="M -6 3 a 7 7 0 1 0 2 -7 M -3 -9 l -1 5 l 5 0" stroke="#0b2e3a" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </g>
                </g>
              </g>
            )}
            {erro && (
              <text x={rx + 6} y={ry + rh + 16} fontSize="11" fontWeight="600" fill={ERRO}>
                {r.problema === "fora" ? "Passa da parede" : `Sobre a Rua ${r.sobrepoeCom}`}
              </text>
            )}
          </g>
        );
      })}

      {/* Portas por cima da parede externa: a abertura apaga o trecho de parede. */}
      {elementos
        .filter((el) => el.tipo === "porta" || el.tipo === "janela")
        .map((el) => {
          const escolhido = editor?.elementoSelecionado === el.id;
          return (
            <g key={el.id} onPointerDown={editor ? (ev) => editor.onElemento(ev, el.id) : undefined} style={editor ? { cursor: "move" } : undefined}>
              <rect x={x(el.x)} y={x(el.y)} width={el.largura * PX} height={el.profundidade * PX} fill="transparent" />
              {el.tipo === "janela" ? (
                <Janela el={el} c={p} fundo={editor ? p.editor : p.fundo[0]} escolhido={!!escolhido} />
              ) : (
                <Porta el={el} largura={leiaute.largura} profundidade={leiaute.profundidade} c={p} fundo={editor ? p.editor : p.fundo[0]} escolhido={!!escolhido} />
              )}
              {el.rotulo && !editor && (
                <text x={x(el.x) + 4} y={x(el.y) - 6} fontSize="11" fontWeight="600" fill="currentColor" className="text-petroleo dark:text-[#cfe9ee]">
                  {el.rotulo}
                </text>
              )}
            </g>
          );
        })}

      {/* Entrada do galpão */}
      <g pointerEvents={editor ? undefined : "none"} data-entrada onPointerDown={editor?.onEntrada} style={editor ? { cursor: "grab" } : undefined}>
        {editor && <line x1={entrada.x1} y1={entrada.y1} x2={entrada.x2} y2={entrada.y2} stroke="transparent" strokeWidth="26" />}
        <line x1={entrada.x1} y1={entrada.y1} x2={entrada.x2} y2={entrada.y2} stroke={p.entrada} strokeWidth="5" strokeDasharray="9 6" />
        <text
          x={entrada.tx}
          y={entrada.ty}
          textAnchor="middle"
          fontSize="16"
          fontWeight="700"
          letterSpacing=".12em"
          fill={p.entrada}
          transform={entrada.giro ? `rotate(-90 ${entrada.tx} ${entrada.ty})` : undefined}
        >
          ENTRADA
        </text>
      </g>

      {/* Prévia da parede que está sendo desenhada. */}
      {editor?.previa && (() => {
        const pv = editor.previa;
        const cor = pv.tira ? ERRO : LARANJA;
        const n = pv.n ?? 1;
        const px = x(pv.x);
        const py = x(pv.y);
        const w = pv.largura * PX;
        const h = pv.profundidade * PX;
        return (
          <g pointerEvents="none" data-previa-modulos={pv.n}>
            <rect x={px} y={py} width={w} height={h} fill={cor} opacity=".3" stroke={cor} strokeWidth="2" strokeDasharray="5 4" />
            {pv.n !== undefined &&
              Array.from({ length: n - 1 }, (_, i) =>
                pv.vertical ? (
                  <line key={i} x1={px} x2={px + w} y1={py + (h * (i + 1)) / n} y2={py + (h * (i + 1)) / n} stroke={cor} strokeDasharray="3 3" />
                ) : (
                  <line key={i} y1={py} y2={py + h} x1={px + (w * (i + 1)) / n} x2={px + (w * (i + 1)) / n} stroke={cor} strokeDasharray="3 3" />
                ),
              )}
            {pv.rotulo && (
              <g transform={`translate(${px + w / 2} ${py + h + 22})`}>
                <rect x="-85" y="-16" width="170" height="26" rx="13" fill="#0b2e3a" />
                <text textAnchor="middle" y="2" fontSize="14" fontWeight="600" fill="#fff">{pv.rotulo}</text>
              </g>
            )}
          </g>
        );
      })()}
    </svg>
  );
}
