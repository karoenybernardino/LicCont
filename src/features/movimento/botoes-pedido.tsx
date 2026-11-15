"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { decidirPedido } from "./acoes";

const BOTAO =
  "inline-flex min-h-[34px] items-center justify-center rounded-lg border border-linha px-4 text-[13px] whitespace-nowrap text-texto hover:shadow-[inset_0_0_0_1.5px_#0e7490] focus-visible:outline-2 focus-visible:outline-foco disabled:opacity-55";

// Aprovar e recusar na linha do pedido. Quem pediu só pode cancelar (recusar);
// o servidor confere o papel de novo e o erro vem sem dado pessoal.
export function BotoesPedido({ id, podeAprovar, meu, vencido }: { id: string; podeAprovar: boolean; meu: boolean; vencido: boolean }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const decidir = (acao: "aprovar" | "recusar") =>
    iniciar(async () => {
      const r = await decidirPedido({ id, acao });
      if (r.erro) setErro(r.erro);
      else if (r.aviso) setErro(r.aviso);
      else router.refresh();
    });
  return (
    <span className="flex flex-col items-start gap-1">
      <span className="flex gap-2">
        {podeAprovar && !meu && !vencido && (
          <button type="button" disabled={pendente} onClick={() => decidir("aprovar")} className={BOTAO}>
            Aprovar
          </button>
        )}
        {(podeAprovar || meu) && (
          <button type="button" disabled={pendente} onClick={() => decidir("recusar")} className={BOTAO}>
            {meu && !podeAprovar ? "Cancelar" : "Recusar"}
          </button>
        )}
      </span>
      {erro && <span role="alert" className="max-w-[220px] text-xs whitespace-normal text-texto-suave">{erro}</span>}
    </span>
  );
}
