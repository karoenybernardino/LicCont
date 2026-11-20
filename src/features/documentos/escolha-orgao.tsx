"use client";

import { ORGAOS, type Orgao } from "./tipos";

// Botão de dois estados Câmara | Prefeitura (decisão do dono: só o botão).
export function EscolhaOrgao({ id, valor, aoEscolher }: { id?: string; valor: Orgao | ""; aoEscolher: (o: Orgao) => void }) {
  return (
    <div id={id} role="radiogroup" aria-label="Órgão" className="inline-flex shrink-0 gap-[3px] rounded-[22px] border border-linha bg-campo p-[3px]">
      {(["camara", "prefeitura"] as const).map((o) => (
        <button
          key={o}
          type="button"
          role="radio"
          aria-checked={valor === o}
          onClick={() => aoEscolher(o)}
          className={`min-h-[34px] rounded-[18px] px-[18px] text-[13px] focus-visible:outline-2 focus-visible:outline-foco ${valor === o ? "bg-aqua font-semibold text-petroleo" : "text-texto-suave"}`}
        >
          {ORGAOS[o]}
        </button>
      ))}
    </div>
  );
}
