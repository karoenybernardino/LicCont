"use client";

import Link from "next/link";
import { useState } from "react";
import { Pilula } from "@/ui/canvas";
import { Painel, TituloPainel } from "@/features/estrutura/componentes";
import type { SituacaoTermo } from "./tipos";
import { LINHA, SELECAO, SUAVE, TXT } from "./ui";

export type LinhaTermo = { id: string; termo: string; secretaria: string; documentos: string; geradoEm: string; situacao: SituacaoTermo; observacao: string };

const FILTROS = [
  { id: "todos", rotulo: "Todos", vale: () => true },
  { id: "abertos", rotulo: "Abertos", vale: (s: SituacaoTermo) => s === "rascunho" || s === "em_ciencia" },
  { id: "aprovados", rotulo: "Aprovados", vale: (s: SituacaoTermo) => s === "aprovado" },
  { id: "cancelados", rotulo: "Cancelados", vale: (s: SituacaoTermo) => s === "cancelado" },
] as const;

const ROTULO_SITUACAO: Record<SituacaoTermo, string> = { rascunho: "Rascunho", em_ciencia: "Em ciência", aprovado: "Aprovado", cancelado: "Cancelado" };
const COLUNAS = "grid-cols-[1.1fr_1.1fr_.8fr_1fr_1.6fr_92px]";
const th = `text-[11px] font-medium tracking-[.05em] uppercase ${SUAVE}`;

export function Situacao({ situacao }: { situacao: SituacaoTermo }) {
  if (situacao === "cancelado") {
    return (
      <span className={`rounded-xl border bg-[#e3f3f5] px-2.5 py-[3px] text-xs font-semibold whitespace-nowrap text-[#0b4f5c] dark:bg-[#0a1418] dark:text-[#9bb8bf] border-[#bfe0e5] dark:border-[#1b3a44]`}>
        {ROTULO_SITUACAO[situacao]}
      </span>
    );
  }
  return <Pilula tom={situacao === "aprovado" ? "ok" : "aviso"}>{ROTULO_SITUACAO[situacao]}</Pilula>;
}

// Painel "Termos de eliminação" (quadro TemporalidadeTermos*): filtro, lista e Abrir.
export function PainelTermos({ linhas }: { linhas: LinhaTermo[] }) {
  const [filtro, setFiltro] = useState<(typeof FILTROS)[number]["id"]>("todos");
  const ativo = FILTROS.find((f) => f.id === filtro) ?? FILTROS[0];
  const visiveis = linhas.filter((l) => ativo.vale(l.situacao));

  return (
    <Painel>
      <div className="flex items-center justify-between gap-3">
        <div>
          <TituloPainel>Termos de eliminação</TituloPainel>
          <p className={`mt-0.5 text-xs ${SUAVE}`}>Um termo por secretaria: listagem → edital de ciência (45 dias) → aprovação.</p>
        </div>
        <div role="group" aria-label="Filtrar termos" className={`inline-flex gap-[3px] rounded-[13px] border bg-white p-[3px] dark:bg-[#05090b] ${LINHA}`}>
          {FILTROS.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={f.id === filtro}
              onClick={() => setFiltro(f.id)}
              className={`min-h-[34px] rounded-[10px] border border-transparent px-4 text-[13px] hover:border-[#0e7490] focus-visible:outline-2 focus-visible:outline-[#0e7490] dark:hover:border-[#2dd4bf] dark:focus-visible:outline-[#2dd4bf] ${TXT} ${
                f.id === filtro ? `font-semibold ${SELECAO}` : "bg-transparent font-normal"
              }`}
            >
              {f.rotulo}
            </button>
          ))}
        </div>
      </div>
      <div className="-mx-5 -mb-[18px]">
        <div className={`grid ${COLUNAS} gap-3 border-y bg-[rgba(14,116,144,.08)] px-5 py-2.5 dark:bg-[rgba(45,212,191,.07)] ${LINHA}`}>
          <span className={th}>Termo</span>
          <span className={th}>Secretaria</span>
          <span className={th}>Documentos</span>
          <span className={th}>Gerado em</span>
          <span className={th}>Situação</span>
          <span />
        </div>
        {visiveis.length === 0 && <p className={`border-b px-5 py-4 text-sm ${LINHA} ${SUAVE}`}>Nenhum termo neste filtro.</p>}
        {visiveis.map((l) => (
          <div
            key={l.id}
            className={`grid ${COLUNAS} items-center gap-3 border-b px-5 py-[11px] hover:shadow-[inset_0_0_0_1.5px_#0e7490] dark:hover:shadow-[inset_0_0_0_1.5px_#2dd4bf] ${LINHA}`}
          >
            <span className="font-mono text-sm font-medium">{l.termo}</span>
            <span className="text-sm">{l.secretaria}</span>
            <span className="text-sm">{l.documentos}</span>
            <span className={`font-mono text-[13px] font-medium ${SUAVE}`}>{l.geradoEm}</span>
            <span className="flex min-w-0 items-center gap-2.5">
              <Situacao situacao={l.situacao} />
              <span className={`truncate text-xs ${SUAVE}`}>{l.observacao}</span>
            </span>
            <span className="flex justify-end">
              <Link
                href={`/temporalidade/termo/${l.id}`}
                aria-label={`Abrir ${l.termo}`}
                className={`inline-flex min-h-[34px] items-center rounded-lg border bg-transparent px-3.5 text-[13px] font-medium hover:border-[#0e7490] focus-visible:outline-2 focus-visible:outline-[#0e7490] dark:hover:border-[#2dd4bf] dark:focus-visible:outline-[#2dd4bf] ${LINHA} ${TXT}`}
              >
                Abrir
              </Link>
            </span>
          </div>
        ))}
      </div>
    </Painel>
  );
}
