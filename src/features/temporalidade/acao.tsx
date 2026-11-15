"use client";

import { useActionState, type ReactNode } from "react";
import { Girando } from "@/ui/carregando";
import type { EstadoAcao } from "@/ui/formulario";
import { BOTAO_CONTORNO, BOTAO_PRIMARIO } from "./ui";

// Formulário de uma etapa do termo (registrar edital, aprovar, cancelar): botão
// do tamanho do quadro, erro anunciado (role=alert) e aviso de sucesso.
export function AcaoTermo({
  acao,
  botao,
  enviando,
  variante = "primario",
  children,
  className = "",
}: {
  acao: (estado: EstadoAcao, dados: FormData) => Promise<EstadoAcao>;
  botao: string;
  enviando: string;
  variante?: "primario" | "contorno";
  children?: ReactNode;
  className?: string;
}) {
  const [estado, enviar, pendente] = useActionState(acao, undefined);
  return (
    <form action={enviar} className={`flex flex-col gap-2.5 ${className}`}>
      {children}
      {estado?.erro && (
        <p role="alert" className="text-sm text-erro">
          {estado.erro}
        </p>
      )}
      {estado?.aviso && (
        <p role="status" className="text-sm">
          {estado.aviso}
        </p>
      )}
      <button type="submit" disabled={pendente} className={`${variante === "primario" ? BOTAO_PRIMARIO : BOTAO_CONTORNO} w-full`}>
        {pendente ? (
          <span className="inline-flex items-center gap-2">
            <Girando />
            {enviando}
          </span>
        ) : (
          botao
        )}
      </button>
    </form>
  );
}
