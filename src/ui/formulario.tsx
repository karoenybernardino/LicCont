"use client";

import { useActionState, type ReactNode } from "react";
import { Botao } from "./botao";
import { Girando } from "./carregando";

export type EstadoAcao = { erro?: string; aviso?: string; senha?: string } | undefined;

// Formulário de Server Action com a mensagem de erro anunciada (role=alert),
// aviso de sucesso (role=status), senha provisória mostrada uma vez e o botão
// desabilitado enquanto envia.
export function Formulario({
  acao,
  botao,
  enviando,
  children,
  className = "",
  variante,
}: {
  acao: (estado: EstadoAcao, dados: FormData) => Promise<EstadoAcao>;
  botao: string;
  enviando: string;
  children: ReactNode;
  className?: string;
  variante?: "principal" | "secundario";
}) {
  const [estado, enviar, pendente] = useActionState(acao, undefined);
  return (
    <form action={enviar} className={`flex flex-col gap-[18px] ${className}`}>
      {children}
      {estado?.erro && (
        <p role="alert" data-testid="erro-formulario" className="text-sm text-erro">
          {estado.erro}
        </p>
      )}
      {estado?.aviso && (
        <div role="status" className="rounded-lg border border-linha bg-superficie-2 p-3 text-sm">
          <p>{estado.aviso}</p>
          {estado.senha && (
            <p className="mt-2">
              Senha provisória:{" "}
              <code data-testid="senha-provisoria" className="font-mono font-semibold">
                {estado.senha}
              </code>
              <span className="mt-1 block text-texto-suave">
                Passe à pessoa por fora do sistema. Ela cria a própria senha no primeiro acesso. Esta senha
                não aparece de novo.
              </span>
            </p>
          )}
        </div>
      )}
      <Botao type="submit" variante={variante} disabled={pendente} className="w-full">
        {pendente ? (
          <span className="inline-flex items-center justify-center gap-2">
            <Girando />
            {enviando}
          </span>
        ) : (
          botao
        )}
      </Botao>
    </form>
  );
}
