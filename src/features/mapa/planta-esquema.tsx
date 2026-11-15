"use client";

// Planta baixa "visão de cima" do quadro "Mapa — planta baixa": uma faixa por
// rua, um quadrado por módulo (turquesa se tem caixas, tracejado se está livre),
// o módulo da caixa escolhida em laranja e os rótulos M1…Mn embaixo. A planta
// com paredes e medidas continua no editor.
import { CORES, type Tema } from "./cores";
import type { Leiaute, ModuloLeiaute } from "./geometria";
import type { Faixa } from "./tipos";

type Props = {
  leiaute: Leiaute;
  tema: Tema;
  moduloSelecionado: string | null;
  codigoCaixa: string | null;
  modulosDestacados?: Set<string>;
  faixaDoModulo?: (m: ModuloLeiaute) => Faixa | null;
  onModulo?: (m: ModuloLeiaute) => void;
};

const LARANJA = "#ff9f1c";
const COLUNA = 62;

export function PlantaEsquema({ leiaute, tema, moduloSelecionado, codigoCaixa, modulosDestacados, faixaDoModulo, onModulo }: Props) {
  const c = CORES[tema];
  const ruas = [...leiaute.ruas].sort((a, b) => a.codigo.localeCompare(b.codigo));
  const porRua = new Map(ruas.map((r) => [r.id, leiaute.modulos.filter((m) => m.ruaId === r.id).sort((a, b) => a.numero - b.numero)]));
  const colunas = Math.max(1, ...ruas.map((r) => porRua.get(r.id)?.length ?? 0));
  const ruaSel = leiaute.modulos.find((m) => m.id === moduloSelecionado)?.ruaId ?? null;
  const numeroSel = leiaute.modulos.find((m) => m.id === moduloSelecionado)?.numero ?? null;
  const grade = { gridTemplateColumns: `repeat(${colunas}, ${COLUNA}px)` };
  const etiqueta = tema === "escuro" ? { background: "#2dd4bf", color: "#0b2e3a" } : { background: c.planta.rotulo, color: c.planta.rotuloTexto };

  return (
    <div className="flex size-full flex-col items-center gap-5 overflow-auto p-5" style={{ background: `linear-gradient(180deg, ${c.planta.fundo[0]}, ${c.planta.fundo[1]})` }}>
      <p className="rounded-full px-8 py-1.5 text-[13px] font-bold tracking-[.12em] uppercase" style={etiqueta}>
        Entrada do galpão
      </p>
      <div className="flex w-full max-w-[560px] flex-col gap-3.5" role="group" aria-label="Planta baixa do galpão">
        {ruas.map((r) => {
          const mods = porRua.get(r.id) ?? [];
          const rSel = r.id === ruaSel;
          return (
            <div key={r.id} className="flex items-center gap-3">
              <span
                className="flex h-8 w-[34px] shrink-0 items-center justify-center rounded-lg font-mono text-sm font-medium"
                style={rSel ? { background: LARANJA, color: "#0b2e3a" } : etiqueta}
              >
                {r.codigo}
              </span>
              <div className="grid min-h-[78px] flex-1 items-center justify-start gap-x-2.5 rounded-xl px-4 py-3.5" style={{ ...grade, background: c.planta.rua }}>
                {Array.from({ length: colunas }, (_, i) => {
                  const m = mods[i];
                  if (!m || m.caixas === 0) {
                    return <span key={i} aria-hidden className="h-[50px] rounded-[10px] border border-dashed" style={{ borderColor: c.planta.livreBorda, background: c.planta.livre }} />;
                  }
                  const sel = m.id === moduloSelecionado;
                  const faixa = faixaDoModulo?.(m);
                  const fundo = sel ? LARANJA : faixa !== null && faixa !== undefined ? c.ocupacao[faixa] : undefined;
                  const nome = `Rua ${r.codigo}, módulo ${m.numero}, ${m.caixas === 1 ? "1 caixa" : `${m.caixas} caixas`}`;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      aria-label={sel && codigoCaixa ? `${nome}, caixa ${codigoCaixa} selecionada` : nome}
                      aria-pressed={sel}
                      onClick={() => onModulo?.(m)}
                      className="relative flex h-[50px] items-center justify-center rounded-[10px] font-mono text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco"
                      style={{
                        background: fundo ?? `linear-gradient(145deg, ${c.planta.modulo[0]}, ${c.planta.modulo[1]})`,
                        border: sel ? "3px solid #e08500" : modulosDestacados?.has(m.id) ? `3px solid ${LARANJA}` : "1px solid rgba(11,46,58,.18)",
                        color: "#0b2e3a",
                      }}
                    >
                      <span aria-hidden className="absolute top-1.5 right-2 left-2 h-[3px] rounded bg-white/70" />
                      {sel && codigoCaixa ? codigoCaixa : null}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
        <div className="flex items-center gap-3">
          <span aria-hidden className="w-[34px] shrink-0" />
          <div className="grid flex-1 justify-start gap-x-2.5 px-4" style={grade}>
            {Array.from({ length: colunas }, (_, i) => (
              <span
                key={i}
                aria-hidden
                className="justify-self-center rounded-md px-2.5 py-1 font-mono text-[13px] font-medium"
                style={numeroSel === i + 1 ? { background: LARANJA, color: "#0b2e3a" } : etiqueta}
              >
                M{i + 1}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
