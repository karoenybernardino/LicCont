"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { devolverEmprestimo } from "./acoes";

// Botão "Devolver" da linha. Em erro mostra o motivo ao lado, sem dado pessoal.
export function BotaoDevolver({ id }: { id: string }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  return (
    <span className="flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={pendente}
        onClick={() =>
          iniciar(async () => {
            const r = await devolverEmprestimo({ id });
            if (r.erro) setErro(r.erro);
            else if (r.aviso) setErro(r.aviso);
            else router.refresh();
          })
        }
        className="inline-flex min-h-[34px] items-center justify-center rounded-lg border border-linha px-4 text-[13px] whitespace-nowrap text-texto hover:shadow-[inset_0_0_0_1.5px_#0e7490] focus-visible:outline-2 focus-visible:outline-foco disabled:opacity-55"
      >
        Devolver
      </button>
      {erro && <span role="alert" className="max-w-[200px] text-xs whitespace-normal text-texto-suave">{erro}</span>}
    </span>
  );
}
