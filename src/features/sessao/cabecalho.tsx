import type { ReactNode } from "react";
import { BotaoEnviar } from "@/ui/botao-enviar";
import { Logo } from "@/ui/logo";
import { SeletorTema } from "@/ui/seletor-tema";
import { sair } from "./acoes";

// Barra do sistema: marca, secretaria em uso, tema e Sair.
export function CabecalhoSistema({ children }: { children?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-linha px-4 py-3 sm:px-6">
      <Logo className="text-2xl" />
      <div className="flex flex-wrap items-center gap-3">
        {children}
        <SeletorTema />
        <form action={sair}>
          <BotaoEnviar
            className="rounded-full border border-linha px-3 py-1.5 text-sm text-texto hover:border-destaque focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco"
          >
            Sair
          </BotaoEnviar>
        </form>
      </div>
    </header>
  );
}
