"use client";

import { useActionState, type ReactNode } from "react";
import { Botao } from "./botao";

type Estado = { erro?: string } | undefined;

// Formulário de Server Action com a mensagem de erro anunciada (role=alert)
// e o botão desabilitado enquanto envia.
export function Formulario({
  acao,
  botao,
  enviando,
  children,
  className = "",
}: {
  acao: (estado: Estado, dados: FormData) => Promise<Estado>;
  botao: string;
  enviando: string;
  children: ReactNode;
  className?: string;
}) {
  const [estado, enviar, pendente] = useActionState(acao, undefined);
  return (
    <form action={enviar} className={`flex flex-col gap-[18px] ${className}`}>
      {children}
      {estado?.erro && (
        <p role="alert" className="text-sm text-erro">
          {estado.erro}
        </p>
      )}
      <Botao type="submit" disabled={pendente} className="w-full">
        {pendente ? enviando : botao}
      </Botao>
    </form>
  );
}
