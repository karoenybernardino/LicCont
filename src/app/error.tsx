"use client";

import { CartaoErro, Acoes, ESTILO_PRINCIPAL, LinkSecundario, MolduraErro } from "@/features/sessao/erro";

// Erro de tela: só o código curto (digest, sem dado pessoal) para o suporte.
export default function Erro({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <MolduraErro>
      <CartaoErro
        solo
        icone="alerta"
        codigo="ERRO DO SISTEMA"
        titulo="Algo deu errado do nosso lado"
        texto="Nada do que você salvou foi perdido. Tente de novo em alguns instantes. Se continuar, avise o suporte."
      >
        {error.digest && (
          <p className="text-[13px] text-texto-suave">
            Código <span className="font-mono font-medium text-texto">{error.digest}</span>
          </p>
        )}
        <Acoes>
          <button type="button" onClick={reset} className={ESTILO_PRINCIPAL}>
            Tentar de novo
          </button>
          <LinkSecundario href="/inicio">Voltar ao início</LinkSecundario>
        </Acoes>
      </CartaoErro>
    </MolduraErro>
  );
}
