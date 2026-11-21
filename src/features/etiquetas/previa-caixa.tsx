"use client";

import { MESES_ABREV, ajustarRotulos, dividirItens, rotulosDosItens, usaLayoutGeral } from "./ajuste";
import type { CaixaEtiqueta } from "./dados";
import type { ReactNode } from "react";

export const nomeDoOrgao = (o: "prefeitura" | "camara") => (o === "camara" ? "CÂMARA" : "PREFEITURA");
export type LogosPrevia = { prefeitura?: string | null; camara?: string | null; parceira?: string | null };

// Prévia aproximada (a folha de verdade é o PDF). Mostra a primeira caixa escolhida, com o mesmo ajuste do PDF:
// todos os itens aparecem (nada de "..." nem "+N itens"); lista grande reduz a fonte e, no mínimo, vira partes.
export function PreviaCaixa({ c, dividir, logos, qr }: { c: CaixaEtiqueta | undefined; dividir: boolean; logos?: LogosPrevia; qr?: ReactNode }) {
  if (!c) return <p className="py-10 text-center text-sm text-texto-suave">Marque uma caixa para ver a etiqueta.</p>;
  const geral = usaLayoutGeral(c);
  const partes = geral ? [] : dividirItens(c.itens, dividir);
  const itens = partes[0] ?? [];
  const aj = ajustarRotulos(rotulosDosItens(itens));
  const rotulos = rotulosDosItens(itens);
  const esc = 408 / 474; // largura da prévia / largura do cartão
  return (
    <div className="mx-auto flex w-full max-w-[440px] flex-col gap-2 rounded-2xl border border-linha bg-white p-4 text-[#0b2e3a]">
      <div className="flex items-center gap-3">
        {(c.orgao === "camara" ? logos?.camara : logos?.prefeitura) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={(c.orgao === "camara" ? logos?.camara : logos?.prefeitura) ?? ""} alt="" className="size-12 shrink-0 rounded-lg object-contain" />
        ) : (
          <span aria-hidden className="size-12 shrink-0 rounded-lg border border-dashed border-[#cfdde2]" />
        )}
        <b className="font-titulo text-[18px] leading-tight break-words">{nomeDoOrgao(c.orgao)}</b>
      </div>
      <div className="h-[5px] rounded bg-[linear-gradient(90deg,#0e7490,#2dd4bf)]" />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <b className="font-titulo text-[22px] break-words">{c.titulo}</b>
        <span className="flex gap-1.5">
          {c.volume && <span className="rounded-full bg-[#0b2e3a] px-3 py-1 text-[11px] font-bold text-white">VOL. {c.volume.n}/{c.volume.total}</span>}
          {partes.length > 1 && <span className="rounded-full bg-[#0b2e3a] px-3 py-1 text-[11px] font-bold text-white">PARTE 1/{partes.length}</span>}
        </span>
      </div>
      {geral && (
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 rounded-xl bg-[#0b2e3a] px-3 py-2 text-[11px] text-[#2dd4bf]">
          <span>FUNDO<b className="block text-[13px] break-words text-white">{c.fundo || "—"}</b></span>
          <span>SETOR<b className="block text-[13px] break-words text-white">{c.setor || "—"}</b></span>
        </div>
      )}
      <div className="flex flex-wrap gap-x-6 text-[11px] text-[#3f5e66]">
        <span>CLASSE<b className="block text-[13px] break-words text-[#0b2e3a]">{c.classe}</b></span>
        {c.tipologia && <span>TIPOLOGIA DOCUMENTAL<b className="block text-[13px] break-words text-[#0b2e3a]">{c.tipologia}</b></span>}
      </div>
      {geral ? (
        <>
          <div>
            <span className="text-[11px] text-[#3f5e66]">MESES</span>
            <div className="mt-0.5 grid grid-cols-12 gap-px">
              {MESES_ABREV.map((m, i) => (
                <span key={m} className={`rounded px-0 py-0.5 text-center text-[8px] font-semibold ${c.meses.includes(i + 1) ? "bg-[#0b2e3a] text-white" : "border border-[#cfdde2] text-[#3f5e66]"}`}>{m}</span>
              ))}
            </div>
          </div>
          <div className="flex gap-6 text-[11px] text-[#3f5e66]">
            <span>ANO LIMITE<b className="block text-[13px] text-[#0b2e3a]">{c.anoLimite ?? "—"}</b></span>
            <span>DIGITALIZADO<b className="block text-[13px] text-[#0b2e3a]">{c.digitalizada ? "Sim" : "Não"}</b></span>
          </div>
          <span className="text-[11px] text-[#3f5e66]">OBSERVAÇÕES<b className="block text-[12px] font-semibold break-words text-[#0b2e3a]">{c.observacao || "—"}</b></span>
        </>
      ) : (
        <div>
          <span className="text-[11px] text-[#3f5e66]">{itens.length === 1 ? "PROCESSO" : `PROCESSOS · ${itens.length}`}</span>
          <ul
            aria-label="Processos da caixa"
            className="mt-0.5 grid gap-x-0 font-bold"
            style={{ gridAutoFlow: "column", gridTemplateRows: `repeat(${aj.linhas}, auto)`, gridTemplateColumns: `repeat(${aj.colunas}, minmax(0, 1fr))`, fontSize: `${(aj.tam * esc).toFixed(1)}px`, lineHeight: 1.22 }}
          >
            {rotulos.map((r, n) => <li key={n}>{r}</li>)}
          </ul>
          {partes.length > 1 && <p className="mt-1 text-[11px] text-[#3f5e66]">Lista grande: sai em {partes.length} etiquetas (parte 1/{partes.length} a {partes.length}/{partes.length}).</p>}
        </div>
      )}
      <div className="flex gap-6 rounded-xl bg-[#edf5f7] px-3 py-2 text-[10px] text-[#3f5e66]">
        <span>CÓDIGO<b className="block text-[14px] text-[#0b2e3a]">{c.codigo}</b></span>
        <span>PRAZO DE GUARDA<b className="block text-[12px] break-words text-[#0b2e3a]">{c.prazo}</b></span>
      </div>
      <div className="flex items-center justify-between gap-3 rounded-2xl bg-[#0b2e3a] p-3 text-white">
        <div>
          <b className="font-titulo text-[32px] leading-none"><span className="text-[#2dd4bf]">CX</span> - {c.numero}</b>
          <span className="mt-1 block text-[10px] tracking-wider text-[#9bb8bf]">LOCALIZAÇÃO <span className="rounded-full bg-[#2dd4bf] px-2 py-0.5 font-mono font-bold text-[#0b2e3a]">{c.localizacao}</span></span>
        </div>
        {qr ?? <span aria-hidden className="size-14 shrink-0 rounded-lg bg-white" />}
      </div>
      {logos?.parceira && (
        <div className="flex items-center gap-2 border-t border-[#cfdde2] pt-2 text-[10px] text-[#3f5e66]">
          Serviço executado por
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logos.parceira} alt="" className="h-9 max-w-[140px] object-contain" />
        </div>
      )}
    </div>
  );
}
