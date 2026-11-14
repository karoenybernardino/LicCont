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
            <span aria-hidden className="flex size-[42px] shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(145deg,#ffd27a,#ff9f1c)] font-mono text-sm font-medium text-[#0b2e3a]">
              C{String(d.caixa).padStart(2, "0")}
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
            <span className="rounded-xl bg-[#ccfbf1] px-2.5 py-1 text-xs font-semibold text-[#115e59] dark:bg-[#0e4a45] dark:text-[#7ff0df]">Disponível</span>
            <span className="rounded-xl bg-superficie-2 px-2.5 py-1 text-xs font-semibold">
              {d.total} de {d.capacidade} documentos
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled className={`${botaoBorda} cursor-not-allowed`}>
              <span className="opacity-60">Registrar empréstimo</span> <span className="ml-1.5 text-[11px] text-texto-suave">em breve</span>
            </button>
            <button type="button" disabled className={`${botaoBorda} cursor-not-allowed`}>
              <span className="opacity-60">Imprimir etiqueta</span> <span className="ml-1.5 text-[11px] text-texto-suave">em breve</span>
            </button>
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
        <h2 className="font-titulo text-[15px] font-bold">Dentro da caixa</h2>
        <p className="text-xs text-texto-suave">{d.total === 1 ? "1 documento nesta caixa" : `${d.total} documentos nesta caixa`}</p>
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
