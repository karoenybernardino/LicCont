"use client";

import { useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";

// Seletor "Prefeitura" do topo (quadros PartPainel*). O valor vai na URL (?p=) e o servidor
// confere se a pessoa pode ver aquela prefeitura. Com "acao", troca a prefeitura em que a pessoa atua
// (Server Action que valida, grava o cookie e atualiza a tela).
export function SeletorPrefeitura({ opcoes, atual, rotulo = "Prefeitura", acao }: { opcoes: { valor: string; texto: string }[]; atual: string; rotulo?: string; acao?: (id: string) => Promise<void> }) {
  const router = useRouter();
  const [, iniciar] = useTransition();
  const caminho = usePathname();
  return (
    <label className="flex h-[38px] items-center gap-2 rounded-[10px] border border-linha bg-superficie pr-2.5 pl-3 dark:bg-[#05090b]">
      <span className="text-[11px] font-semibold tracking-[.05em] text-texto-suave uppercase">{rotulo}</span>
      <select
        value={atual}
        onChange={(e) => (acao ? iniciar(() => acao(e.target.value)) : router.push(`${caminho}?p=${encodeURIComponent(e.target.value)}`))}
        className="border-0 bg-transparent text-[13px] font-semibold outline-0 focus-visible:outline-2 focus-visible:outline-foco"
      >
        {opcoes.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.texto}
          </option>
        ))}
      </select>
    </label>
  );
}
