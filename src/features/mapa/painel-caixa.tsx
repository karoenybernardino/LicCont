"use client";

// Painéis da direita do mapa: "Caixa selecionada" e "Dentro da caixa" (quadros
// "Fase 4 · Mapa 3D com girar e ocupação" e "Fase 4 · Dentro da caixa").
import Link from "next/link";
import type { ReactNode } from "react";
import { SITUACOES } from "@/features/documentos/tipos";
import type { DetalheCaixa } from "./dados";

const cartao =
  "flex min-w-0 flex-col gap-3 rounded-2xl border border-white/95 bg-white/78 p-4 shadow-[0_10px_30px_rgba(11,46,58,.08),inset_0_1px_0_rgba(255,255,255,.9)] dark:border-[#1b3a44] dark:bg-[linear-gradient(160deg,#0d1d23_0%,#060b0d_55%)] dark:shadow-none";
const foco = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco";
const botaoBorda = `inline-flex min-h-10 items-center justify-center rounded-lg border border-linha px-3.5 text-[13px] font-medium hover:border-destaque max-md:min-h-11 ${foco}`;
const botaoCheio = `inline-flex min-h-10 items-center justify-center rounded-lg bg-[linear-gradient(135deg,#0e7490,#0f766e)] px-4 text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-50 max-md:min-h-11 dark:bg-none dark:bg-[#2dd4bf] dark:text-[#0b2e3a] ${foco}`;

export const estilos = { cartao, botaoBorda, botaoCheio, foco };

const tom = (s: string) =>
  ["em_andamento", "deserta", "fracassada", "revogada", "anulada", "rescindido"].includes(s)
    ? "bg-[#fef3c7] text-[#7c2d12] dark:bg-[#3b2f0b] dark:text-[#fcd34d]"
    : "bg-[#ccfbf1] text-[#115e59] dark:bg-[#0e4a45] dark:text-[#7ff0df]";

export function CaixaSelecionada({ d, carregando, acessorios }: { d: DetalheCaixa | null; carregando: boolean; acessorios?: ReactNode }) {
  return (
    <section aria-label="Caixa selecionada" className={cartao}>
      <h2 className="text-[11px] font-semibold tracking-[.06em] text-texto-suave uppercase">Caixa selecionada</h2>
      {!d ? (
        <p role="status" className="text-sm text-texto-suave">
          {carregando ? "Carregando a caixa…" : "Escolha uma caixa no mapa ou na lista."}
        </p>
      ) : (
        <>
          <div className="flex items-center gap-3">
            <span aria-hidden className="flex size-[42px] shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(145deg,#ffd27a,#ff9f1c)]">
            </span>
            <div className="min-w-0">
              <p className="font-mono text-base leading-5 font-medium">
                Rua {d.rua} · Módulo {d.modulo}
                <br />
                Nível {d.nivel} · Caixa {String(d.caixa).padStart(2, "0")}
              </p>
              <p className="font-mono text-xs text-texto-suave">{d.codigo}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-xl border border-linha bg-white/60 px-2.5 py-1 text-xs font-semibold dark:border-[#1b3a44] dark:bg-transparent">
              {d.total === 1 ? "1 documento" : `${d.total} documentos`}
            </span>
            <span className="rounded-xl bg-[#ccfbf1] px-2.5 py-1 text-xs font-semibold text-[#115e59] dark:bg-[#0e4a45] dark:text-[#7ff0df]">Disponível</span>
          </div>
          {acessorios}
        </>
      )}
    </section>
  );
}

export function DentroDaCaixa({
  d,
  marcaveis,
  marcados,
  onMarcar,
  onMarcarTodos,
  onMover,
  moverAberto,
}: {
  d: DetalheCaixa | null;
  marcaveis: boolean;
  marcados: Set<string>;
  onMarcar(id: string): void;
  onMarcarTodos(): void;
  onMover(): void;
  moverAberto: boolean;
}) {
  if (!d) return null;
  const visiveis = d.documentos.length;
  const oculto = d.total - visiveis;
  const podeMarcar = d.documentos.filter((x) => x.marcavel);
  return (
    <section aria-label="Dentro da caixa" className={cartao}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[11px] font-semibold tracking-[.06em] text-texto-suave uppercase">Dentro da caixa</h2>
        <p className="text-xs">
          <b className="font-semibold">{d.total}</b> {d.total === 1 ? "documento" : "documentos"}
        </p>
      </div>
      {marcaveis && podeMarcar.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={onMarcarTodos} className={botaoBorda}>
            {marcados.size === podeMarcar.length ? "Desmarcar todos" : "Marcar todos"}
          </button>
          <span role="status" className="text-xs text-texto-suave">
            {marcados.size === 1 ? "1 marcado" : `${marcados.size} marcados`}
          </span>
          {marcados.size > 0 && !moverAberto && (
            <button type="button" onClick={onMover} className={botaoCheio}>
              {marcados.size === 1 ? "Mover 1 documento" : `Mover ${marcados.size} documentos`}
            </button>
          )}
        </div>
      )}
      {visiveis === 0 ? (
        <p className="text-sm text-texto-suave">{d.total === 0 ? "Caixa vazia." : "Nenhum documento desta caixa é da sua secretaria."}</p>
      ) : (
        <ul className="sc flex max-h-[300px] flex-col gap-1.5 overflow-y-auto pr-1" aria-label="Documentos da caixa">
          {d.documentos.map((x) => (
            <li key={x.id} className="flex items-center gap-2 rounded-[10px] border border-linha bg-superficie-2 px-2.5 py-2">
              {marcaveis && (
                <input
                  type="checkbox"
                  aria-label={`Marcar ${x.titulo}`}
                  disabled={!x.marcavel}
                  checked={marcados.has(x.id)}
                  onChange={() => onMarcar(x.id)}
                  className="size-5 shrink-0 accent-[#0e7490] disabled:opacity-40"
                />
              )}
              <Link href={`/documentos/${x.id}`} className={`min-w-0 flex-1 rounded ${foco}`}>
                <span className="block truncate font-titulo text-[13px] font-semibold">{x.titulo}</span>
                <span className="block truncate text-[11px] text-texto-suave">
                  {[x.empresa, x.secretaria, x.ano].filter(Boolean).join(" · ")}
                </span>
              </Link>
              <span className={`shrink-0 rounded-xl px-2 py-0.5 text-[11px] font-semibold ${tom(x.situacao)}`}>{SITUACOES[x.situacao] ?? x.situacao}</span>
            </li>
          ))}
        </ul>
      )}
      {oculto > 0 && (
        <p className="text-xs text-texto-suave">
          {visiveis >= 200
            ? "Mostrando os 200 documentos mais recentes da caixa. Para ver os demais, use a pesquisa."
            : `Você vê ${visiveis}. `}
          {visiveis >= 200 ? null : oculto === 1 ? "O outro 1 é de uma secretaria sem acesso." : `Os outros ${oculto} são de secretarias sem acesso.`}
        </p>
      )}
    </section>
  );
}

// "Níveis do módulo N" (quadro "Fase 4 · Mapa 3D com girar e ocupação"): uma linha por
// nível, uma barra por caixa; a selecionada fica laranja. Com a ocupação ligada, caixa vazia fica só no contorno.
export function NiveisDoModulo({
  modulo,
  nivelSel,
  caixaSel,
  vazia,
  onSelecionar,
}: {
  modulo: { numero: number; niveis: { id: string; numero: number; caixas: { id: string; numero: number }[] }[] };
  nivelSel: number | null;
  caixaSel: string | null;
  vazia?(id: string): boolean;
  onSelecionar(id: string): void;
}) {
  const niveis = [...modulo.niveis].sort((a, b) => b.numero - a.numero);
  return (
    <section aria-label={`Níveis do módulo ${modulo.numero}`} className={cartao}>
      <h2 className="text-[11px] font-semibold tracking-[.06em] text-texto-suave uppercase">Níveis do módulo {modulo.numero}</h2>
      <ul className="flex flex-col gap-2.5">
        {niveis.map((n) => {
          const ativo = n.numero === nivelSel;
          return (
            <li key={n.id} className={`flex items-center gap-3 rounded-[10px] px-2.5 py-2 ${ativo ? "border-2 border-[#0e7490] bg-[#fff3d1]/60 dark:border-[#2dd4bf] dark:bg-[#3b2f0b]/40" : "border-2 border-transparent"}`}>
              <span className={`w-6 font-mono text-xs ${ativo ? "font-semibold text-[#ff9f1c]" : "text-texto-suave"}`}>N{n.numero}</span>
              <span className="grid flex-1 grid-flow-col auto-cols-fr gap-2">
                {n.caixas.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    aria-label={`Nível ${n.numero}, caixa ${String(c.numero).padStart(2, "0")}`}
                    aria-pressed={c.id === caixaSel}
                    onClick={() => onSelecionar(c.id)}
                    className={`h-[18px] rounded-[5px] border ${foco} ${
                      c.id === caixaSel
                        ? "border-[#ff9f1c] bg-[#ff9f1c]"
                        : vazia?.(c.id)
                          ? "border-linha bg-white/60 dark:border-[#1b3a44] dark:bg-[#0a1418]"
                          : "border-[#2fb5a0] bg-[#2fb5a0] dark:border-[#2dd4bf] dark:bg-[#2dd4bf]"
                    }`}
                  />
                ))}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// Painel da direita na planta baixa (quadro "Mapa — planta baixa"): etiqueta "Selecionada",
// endereço, quantos documentos e a lista.
export function PainelPlanta({ d, carregando }: { d: DetalheCaixa | null; carregando: boolean }) {
  return (
    <section aria-label="Caixa selecionada" className={cartao}>
      <span className="w-fit rounded-xl bg-[#ccfbf1] px-2.5 py-1 text-xs font-semibold text-[#115e59] dark:bg-[#0e4a45] dark:text-[#7ff0df]">Selecionada</span>
      <h2 className="text-[11px] font-semibold tracking-[.06em] text-texto-suave uppercase">Caixa</h2>
      {!d ? (
        <p role="status" className="text-sm text-texto-suave">
          {carregando ? "Carregando a caixa…" : "Escolha um módulo na planta."}
        </p>
      ) : (
        <>
          <p className="font-mono text-base leading-6 font-medium">
            Rua {d.rua} · Módulo {d.modulo}
            <br />
            Nível {d.nivel} · Caixa {String(d.caixa).padStart(2, "0")}
          </p>
          <span className="sr-only">{d.codigo}</span>
          <p className="text-[13px]">
            <b className="font-semibold">{d.total}</b> {d.total === 1 ? "documento guardado nesta caixa" : "documentos guardados nesta caixa"}
          </p>
          <ul className="sc flex max-h-[420px] flex-col gap-1.5 overflow-y-auto pr-1" aria-label="Documentos da caixa">
            {d.documentos.map((x) => (
              <li key={x.id}>
                <Link href={`/documentos/${x.id}`} className={`flex items-center gap-2 rounded-[10px] border border-linha bg-superficie-2 px-2.5 py-2 ${foco}`}>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-titulo text-[13px] font-semibold">{x.titulo}</span>
                    <span className="block truncate text-[11px] text-texto-suave">{[x.empresa, x.secretaria, x.ano].filter(Boolean).join(" · ")}</span>
                  </span>
                  <span className={`shrink-0 rounded-xl px-2 py-0.5 text-[11px] font-semibold ${tom(x.situacao)}`}>{SITUACOES[x.situacao] ?? x.situacao}</span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
