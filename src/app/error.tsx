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
        texto="Nada do que você salvou foi perdido. Tente de novo em alguns instantes. Se continuar, avise o suporte com o código abaixo."
      >
        {error.digest && (
          <div className="mt-1 flex items-center gap-2.5 rounded-[10px] border border-linha bg-campo py-2 pr-2 pl-3.5">
            <span className="text-xs text-texto-suave">Código</span>
            <span className="font-mono text-[13px] font-medium">{error.digest}</span>
            <button
              type="button"
              onClick={() => void navigator.clipboard?.writeText(error.digest ?? "")}
              className="min-h-[30px] rounded-lg border border-linha px-2.5 text-xs font-medium hover:border-destaque focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco"
            >
              Copiar
            </button>
          </div>
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
