"use client";

import { useActionState } from "react";
import { Girando } from "@/ui/carregando";
import type { EstadoAcao } from "@/ui/formulario";

// Botão de uma ação só (Nova rua, Desativar…), com a resposta logo abaixo.
export function BotaoAcao({
  acao,
  botao,
  rotulo,
  campos,
  principal = false,
}: {
  acao: (estado: EstadoAcao, dados: FormData) => Promise<EstadoAcao>;
  botao: string;
  // Nome acessível quando o texto do botão sozinho é ambíguo ("Desativar").
  rotulo?: string;
  campos: Record<string, string>;
  principal?: boolean;
}) {
  const [estado, enviar, pendente] = useActionState(acao, undefined);
  const estilo = principal
    ? "min-h-10 px-5 bg-destaque text-destaque-texto font-semibold hover:opacity-90"
    : "h-8 px-3 border border-linha text-xs text-texto hover:border-destaque";
  return (
    <form action={enviar} className="flex flex-col items-end gap-1">
      {Object.entries(campos).map(([nome, valor]) => (
        <input key={nome} type="hidden" name={nome} value={valor} />
      ))}
      <button
        type="submit"
        aria-label={rotulo}
        disabled={pendente}
        className={`inline-flex items-center gap-2 rounded-lg text-sm whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco disabled:opacity-50 ${estilo}`}
      >
        {pendente && <Girando />}
        {botao}
      </button>
      {estado?.erro && (
        <p role="alert" className="max-w-64 text-right text-xs text-erro">
          {estado.erro}
        </p>
      )}
      {estado?.aviso && (
        <p role="status" className="max-w-64 text-right text-xs text-texto-suave">
          {estado.aviso}
        </p>
      )}
    </form>
  );
}
