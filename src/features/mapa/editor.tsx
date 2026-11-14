"use client";

// Editor da planta (quadro "Fase 4 · Editor da planta"): tamanho do galpão,
// entrada, ruas arrastáveis, portas, pilares, paredes e áreas. Tudo em células
// de módulo. Desfazer e refazer guardam fotografias do estado.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition, type KeyboardEvent, type PointerEvent } from "react";
import type { Estrutura } from "@/features/estrutura/ocupacao";
import { resumir } from "@/features/estrutura/ocupacao";
import { salvarPlanta } from "./acoes";
import { calcularLeiaute } from "./geometria";
import { MARGEM, PX, PlantaSvg } from "./planta";
import { estilos } from "./painel-caixa";
import { useTema } from "./usar-tema";
import { GIROS, LADOS, TIPOS_ELEMENTO, type ElementoPlanta, type Giro, type LadoEntrada, type Planta, type PosicaoRua, type TipoElemento } from "./tipos";

type Estado = { largura: number; profundidade: number; lado: LadoEntrada; posicao: number; ruas: Record<string, PosicaoRua>; elementos: ElementoPlanta[] };
type Ferramenta = "selecionar" | TipoElemento;

const campo =
  "h-10 w-full rounded-lg border border-borda-campo bg-campo px-2.5 text-[13px] font-medium text-texto focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-foco";
const rotulo = "text-[11px] font-medium tracking-[.05em] text-texto-suave uppercase";
const novoId = () => `novo-${Math.random().toString(36).slice(2, 10)}`;
const padrao: Record<TipoElemento, Pick<ElementoPlanta, "largura" | "profundidade" | "rotulo">> = {
  porta: { largura: 1, profundidade: 2, rotulo: "Porta" },
  pilar: { largura: 1, profundidade: 1, rotulo: null },
  parede: { largura: 4, profundidade: 1, rotulo: null },
  area: { largura: 3, profundidade: 2, rotulo: "Área" },
};

// Campo numérico: guarda o texto enquanto a pessoa digita e só confirma ao sair ou no Enter.
function Num({ valor, min, max, onValor }: { valor: number; min: number; max: number; onValor(v: number): void }) {
  const [texto, setTexto] = useState<string | null>(null);
  const fechar = () => {
    if (texto === null) return;
    const v = Math.max(min, Math.min(max, Math.round(Number(texto) || min)));
    setTexto(null);
    if (v !== valor) onValor(v);
  };
  return (
    <input
      type="number"
      min={min}
      max={max}
      className={campo}
      value={texto ?? valor}
      onChange={(e) => setTexto(e.target.value)}
      onBlur={fechar}
      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), fechar())}
    />
  );
}

export function EditorPlanta({ estrutura, planta, galpaoId, nomeGalpao }: { estrutura: Estrutura; planta: Planta; galpaoId: string; nomeGalpao: string }) {
  const tema = useTema();
  const router = useRouter();
  const svgRef = useRef<SVGSVGElement>(null);
  const inicial = useMemo<Estado>(() => {
    const base = calcularLeiaute(estrutura, [], planta);
    return {
      largura: base.largura,
      profundidade: base.profundidade,
      lado: base.entrada.lado,
      posicao: base.entrada.posicao,
      ruas: planta.ruas,
      elementos: planta.elementos,
    };
  }, [estrutura, planta]);
  const [estados, setEstados] = useState<Estado[]>([inicial]);
  const [indice, setIndice] = useState(0);
  const [rascunho, setRascunho] = useState<Estado | null>(null);
  const [ferramenta, setFerramenta] = useState<Ferramenta>("selecionar");
  const [ruaSel, setRuaSel] = useState<string | null>(null);
  const [elSel, setElSel] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<{ erro: boolean; texto: string } | null>(null);
  const [salvando, salvar] = useTransition();
  const atual = rascunho ?? estados[indice];

  const plantaAtual: Planta = { largura: atual.largura, profundidade: atual.profundidade, entradaLado: atual.lado, entradaPosicao: atual.posicao, ruas: atual.ruas, elementos: atual.elementos };
  const leiaute = useMemo(() => calcularLeiaute(estrutura, [], plantaAtual), [estrutura, atual]); // eslint-disable-line react-hooks/exhaustive-deps
  const problemas = leiaute.ruas.filter((r) => r.problema);
  const foraElemento = atual.elementos.some((e) => e.x + e.largura > atual.largura || e.y + e.profundidade > atual.profundidade);

  const confirmar = (e: Estado) => {
    setEstados((l) => [...l.slice(0, indice + 1), e]);
    setIndice((i) => i + 1);
    setMensagem(null);
  };
  const posicaoDe = (id: string): { x: number; y: number; giro: Giro } => {
    const r = leiaute.ruas.find((x) => x.id === id)!;
    return { x: r.x, y: r.y, giro: r.giro };
  };
  const moverRua = (id: string, p: Partial<{ x: number; y: number; giro: Giro }>, base: Estado = atual) => ({
    ...base,
    ruas: { ...base.ruas, [id]: { ...(base.ruas[id]?.x != null ? (base.ruas[id] as { x: number; y: number; giro: Giro }) : posicaoDe(id)), ...p } },
  });
  const girarRua = (id: string) => {
    const r = leiaute.ruas.find((x) => x.id === id)!;
    confirmar(moverRua(id, { giro: ((r.giro + 90) % 360) as Giro }));
  };

  // Arrastar rua ou elemento: o rascunho acompanha o mouse; soltar confirma.
  function arrastar(e: PointerEvent, aplicar: (dx: number, dy: number) => Estado) {
    e.stopPropagation();
    const svg = svgRef.current;
    if (!svg) return;
    const escala = svg.getBoundingClientRect().width / svg.viewBox.baseVal.width;
    const [x0, y0] = [e.clientX, e.clientY];
    let ultimo: Estado | null = null;
    const mover = (ev: globalThis.PointerEvent) => {
      ultimo = aplicar(Math.round((ev.clientX - x0) / (PX * escala)), Math.round((ev.clientY - y0) / (PX * escala)));
      setRascunho(ultimo);
    };
    const soltar = () => {
      window.removeEventListener("pointermove", mover);
      window.removeEventListener("pointerup", soltar);
      window.removeEventListener("pointercancel", soltar);
      setRascunho(null);
      if (ultimo && JSON.stringify(ultimo) !== JSON.stringify(estados[indice])) confirmar(ultimo);
    };
    window.addEventListener("pointermove", mover);
    window.addEventListener("pointerup", soltar);
    window.addEventListener("pointercancel", soltar);
  }
  const limitar = (v: number) => Math.max(0, Math.min(199, v));

  function aoRua(e: PointerEvent, id: string) {
    setRuaSel(id);
    setElSel(null);
    const p = posicaoDe(id);
    const base = atual;
    arrastar(e, (dx, dy) => moverRua(id, { x: limitar(p.x + dx), y: limitar(p.y + dy) }, base));
  }
  function aoElemento(e: PointerEvent, id: string) {
    setElSel(id);
    setRuaSel(null);
    const el = atual.elementos.find((x) => x.id === id)!;
    const base = atual;
    arrastar(e, (dx, dy) => ({ ...base, elementos: base.elementos.map((x) => (x.id === id ? { ...x, x: limitar(el.x + dx), y: limitar(el.y + dy) } : x)) }));
  }
  function aoFundo(e: PointerEvent) {
    if (ferramenta === "selecionar") {
      setRuaSel(null);
      setElSel(null);
      return;
    }
    const svg = svgRef.current;
    if (!svg) return;
    const r = svg.getBoundingClientRect();
    const escala = r.width / svg.viewBox.baseVal.width;
    const x = limitar(Math.floor(((e.clientX - r.left) / escala - MARGEM) / PX));
    const y = limitar(Math.floor(((e.clientY - r.top) / escala - MARGEM) / PX));
    const id = novoId();
    confirmar({ ...atual, elementos: [...atual.elementos, { id, tipo: ferramenta, x, y, giro: 0, ...padrao[ferramenta] }] });
    setElSel(id);
    setFerramenta("selecionar");
  }

  const remover = () => {
    if (!elSel) return;
    confirmar({ ...atual, elementos: atual.elementos.filter((x) => x.id !== elSel) });
    setMensagem({ erro: false, texto: "Elemento removido." });
    setElSel(null);
  };
  function aoTeclar(e: KeyboardEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).tagName === "INPUT" || (e.target as HTMLElement).tagName === "SELECT") return;
    const passo: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (passo[e.key]) {
      const [dx, dy] = passo[e.key];
      if (ruaSel) {
        const p = posicaoDe(ruaSel);
        confirmar(moverRua(ruaSel, { x: limitar(p.x + dx), y: limitar(p.y + dy) }));
      } else if (elSel) {
        confirmar({ ...atual, elementos: atual.elementos.map((x) => (x.id === elSel ? { ...x, x: limitar(x.x + dx), y: limitar(x.y + dy) } : x)) });
      } else return;
    } else if (e.key.toLowerCase() === "r" && ruaSel) girarRua(ruaSel);
    else if ((e.key === "Delete" || e.key === "Backspace") && elSel) remover();
    else return;
    e.preventDefault();
  }

  function aoSalvar() {
    setMensagem(null);
    salvar(async () => {
      const r = await salvarPlanta({
        galpao: galpaoId,
        largura: atual.largura,
        profundidade: atual.profundidade,
        entradaLado: atual.lado,
        entradaPosicao: atual.posicao,
        ruas: leiaute.ruas.map((x) => {
          const salvo = atual.ruas[x.id];
          return salvo?.x != null ? { id: x.id, x: salvo.x, y: salvo.y, giro: salvo.giro } : { id: x.id, x: null, y: null, giro: 0 };
        }),
        elementos: atual.elementos.map((x) => ({ ...x, id: x.id.startsWith("novo-") ? null : x.id, ativo: true })),
      });
      setMensagem({ erro: !!r.erro, texto: r.erro ?? r.aviso ?? "Planta salva." });
      if (!r.erro) {
        // Recarrega do servidor: o editor remonta com os ids reais dos elementos novos.
        router.refresh();
      }
    });
  }

  const selRua = leiaute.ruas.find((r) => r.id === ruaSel);
  const selEl = atual.elementos.find((x) => x.id === elSel);
  const fora = problemas[0];
  const mudou = indice;

  return (
    <>
      <div className="max-lg:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p role="status" className="text-sm font-medium">
            {mudou === 0 ? "Nenhuma alteração" : mudou === 1 ? "1 alteração não salva" : `${mudou} alterações não salvas`}
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={indice === 0} onClick={() => setIndice((i) => i - 1)} className={estilos.botaoBorda}>Desfazer</button>
            <button type="button" disabled={indice >= estados.length - 1} onClick={() => setIndice((i) => i + 1)} className={estilos.botaoBorda}>Refazer</button>
            <button type="button" disabled={mudou === 0} onClick={() => window.confirm("Descartar todas as alterações não salvas?") && (setEstados([estados[0]]), setIndice(0), setMensagem(null))} className={estilos.botaoBorda}>Descartar</button>
            <button type="button" disabled={salvando || mudou === 0 || problemas.length > 0 || foraElemento} onClick={aoSalvar} className={estilos.botaoCheio}>
              {salvando ? "Salvando…" : "Salvar planta"}
            </button>
          </div>
        </div>
        {(fora || foraElemento) && (
          <p role="alert" className="mt-2 rounded-lg border border-[#d14343] bg-[#fee2e2] px-3 py-2 text-[13px] text-[#991b1b] dark:bg-[#3f1d1d] dark:text-[#fca5a5]">
            {fora
              ? fora.problema === "fora"
                ? `Rua ${fora.codigo} passa da parede. Arraste para dentro do galpão ou gire 90° para salvar.`
                : `Rua ${fora.codigo} está sobre a Rua ${fora.sobrepoeCom}. Afaste uma delas para salvar.`
              : "Há elemento fora das paredes. Arraste para dentro do galpão para salvar."}
          </p>
        )}
        {mensagem && (
          <p role={mensagem.erro ? "alert" : "status"} className={`mt-2 text-[13px] ${mensagem.erro ? "text-erro" : "text-texto-suave"}`}>
            {mensagem.texto}
          </p>
        )}

        <div className="mt-3 grid grid-cols-[230px_minmax(0,1fr)_260px] items-start gap-4" onKeyDown={aoTeclar}>
          <aside className={estilos.cartao} aria-label="Ajustes do galpão">
            <h2 className={rotulo}>Tamanho do galpão</h2>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1 text-xs text-texto-suave">
                Largura
                <Num valor={atual.largura} min={4} max={200} onValor={(v) => confirmar({ ...atual, largura: v })} />
              </label>
              <label className="flex flex-col gap-1 text-xs text-texto-suave">
                Profundidade
                <Num valor={atual.profundidade} min={4} max={200} onValor={(v) => confirmar({ ...atual, profundidade: v })} />
              </label>
            </div>
            <p className="text-xs text-texto-suave">Medidas em células. 1 célula = largura de um módulo de estante.</p>
            <h2 className={rotulo}>Entrada</h2>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1 text-xs text-texto-suave">
                Lado
                <select className={campo} value={atual.lado} onChange={(e) => confirmar({ ...atual, lado: e.target.value as LadoEntrada })}>
                  {Object.entries(LADOS).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs text-texto-suave">
                Posição
                <Num valor={atual.posicao} min={0} max={199} onValor={(v) => confirmar({ ...atual, posicao: v })} />
              </label>
            </div>
            <h2 className={rotulo}>Ferramentas</h2>
            <div role="group" aria-label="Ferramentas" className="flex flex-col gap-1.5">
              {(["selecionar", "porta", "pilar", "parede", "area"] as Ferramenta[]).map((f) => (
                <button key={f} type="button" aria-pressed={ferramenta === f} onClick={() => setFerramenta(f)} className={`${estilos.botaoBorda} justify-start ${ferramenta === f ? "!border-[#ff9f1c] bg-[#fff3d1] text-[#0b2e3a]" : ""}`}>
                  {f === "selecionar" ? "Selecionar e arrastar" : TIPOS_ELEMENTO[f]}
                </button>
              ))}
            </div>
          </aside>

          <section aria-label="Planta do galpão" className={estilos.cartao}>
            <div className="rounded-xl border border-linha p-2" tabIndex={0} aria-describedby="dica-editor">
              <PlantaSvg
                leiaute={leiaute}
                elementos={atual.elementos}
                tema={tema}
                resumo={`Planta de ${nomeGalpao}: ${leiaute.ruas.length} ruas, ${atual.largura} por ${atual.profundidade} células`}
                editor={{ ruaSelecionada: ruaSel, elementoSelecionado: elSel, onRua: aoRua, onElemento: aoElemento, onFundo: aoFundo, onGirar: girarRua, svgRef }}
              />
            </div>
            <p id="dica-editor" className="text-xs text-texto-suave">
              Arraste as ruas na grade · clique no ícone laranja para girar · Delete remove o elemento. Com o foco aqui: setas movem, R gira.
            </p>
          </section>

          <aside className={estilos.cartao} aria-label="Selecionado">
            <h2 className={rotulo}>Selecionado</h2>
            {selRua ? (
              <>
                <p className="font-titulo font-bold">Rua {selRua.codigo}</p>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex flex-col gap-1 text-xs text-texto-suave">
                    Coluna x
                    <Num key={selRua.id + "x" + selRua.x} valor={selRua.x} min={0} max={199} onValor={(v) => confirmar(moverRua(selRua.id, { x: v }))} />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-texto-suave">
                    Linha y
                    <Num key={selRua.id + "y" + selRua.y} valor={selRua.y} min={0} max={199} onValor={(v) => confirmar(moverRua(selRua.id, { y: v }))} />
                  </label>
                </div>
                <div role="group" aria-label="Giro" className="flex gap-1">
                  {GIROS.map((g) => (
                    <button key={g} type="button" aria-pressed={selRua.giro === g} onClick={() => confirmar(moverRua(selRua.id, { giro: g }))} className={`${estilos.botaoBorda} flex-1 !px-0 ${selRua.giro === g ? "!border-[#ff9f1c] bg-[#fff3d1] text-[#0b2e3a]" : ""}`}>
                      {g}°
                    </button>
                  ))}
                </div>
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[13px]">
                  <dt className="text-texto-suave">Módulos</dt><dd>{selRua.modulos} (da estrutura)</dd>
                  <dt className="text-texto-suave">Tamanho</dt><dd>{selRua.w} × {selRua.h} células</dd>
                  <dt className="text-texto-suave">Caixas</dt><dd>{resumir(estrutura, selRua.id).caixas}</dd>
                </dl>
                <button type="button" onClick={() => girarRua(selRua.id)} className={estilos.botaoBorda}>Girar 90°</button>
              </>
            ) : selEl ? (
              <>
                <p className="font-titulo font-bold">{TIPOS_ELEMENTO[selEl.tipo]}</p>
                {(selEl.tipo === "area" || selEl.tipo === "porta") && (
                  <label className="flex flex-col gap-1 text-xs text-texto-suave">
                    Nome
                    <input maxLength={40} className={campo} value={selEl.rotulo ?? ""} onChange={(e) => confirmar({ ...atual, elementos: atual.elementos.map((x) => (x.id === selEl.id ? { ...x, rotulo: e.target.value || null } : x)) })} />
                  </label>
                )}
                <div className="grid grid-cols-2 gap-2">
                  {(["x", "y", "largura", "profundidade"] as const).map((k) => (
                    <label key={k} className="flex flex-col gap-1 text-xs text-texto-suave">
                      {k === "x" ? "Coluna x" : k === "y" ? "Linha y" : k === "largura" ? "Largura" : "Profundidade"}
                      <Num key={selEl.id + k + selEl[k]} valor={selEl[k]} min={k === "x" || k === "y" ? 0 : 1} max={k === "x" || k === "y" ? 199 : 200} onValor={(v) => confirmar({ ...atual, elementos: atual.elementos.map((x) => (x.id === selEl.id ? { ...x, [k]: v } : x)) })} />
                    </label>
                  ))}
                </div>
                <button type="button" onClick={remover} className={estilos.botaoBorda}>Remover elemento</button>
              </>
            ) : (
              <p className="text-sm text-texto-suave">Clique numa rua ou num elemento.</p>
            )}
            <h2 className={`${rotulo} mt-2`}>Ruas</h2>
            <ul className="flex flex-col gap-1.5">
              {leiaute.ruas.map((r) => (
                <li key={r.id}>
                  <button type="button" onClick={() => (setRuaSel(r.id), setElSel(null))} aria-pressed={ruaSel === r.id} className={`${estilos.botaoBorda} w-full justify-between gap-3 ${ruaSel === r.id ? "!border-[#ff9f1c]" : ""}`}>
                    <span className="font-mono">Rua {r.codigo}</span>
                    <span className={`text-xs ${r.problema ? "text-erro" : "text-texto-suave"}`}>
                      {r.problema === "fora" ? "Passa da parede" : r.problema === "sobreposta" ? "Sobreposta" : r.estado === "posicionada" ? "Posicionada" : "Automática"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </div>
      <div className="rounded-2xl border border-linha p-5 text-sm lg:hidden">
        Abra no computador para editar a planta. A tela de edição precisa de 1024 px de largura ou mais.
        <div className="mt-3">
          <Link href="/mapa" className={estilos.botaoBorda}>Voltar ao mapa</Link>
        </div>
      </div>
    </>
  );
}
