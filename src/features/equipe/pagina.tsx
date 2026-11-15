import type { ReactNode } from "react";
import { BotaoEnviar } from "@/ui/botao-enviar";
import { SeletorTema } from "@/ui/seletor-tema";
import { sair } from "@/features/sessao/acoes";
import { BarraLateral } from "@/features/sessao/barra-lateral";

// Moldura do painel da equipe LicCONT: a mesma do sistema, sem secretaria.
export function PaginaEquipe({ titulo, trilha, children }: { titulo: string; trilha?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-1 gap-4 p-4 max-md:flex-col dark:bg-black">
      <BarraLateral
        grupos={[
          [
            { href: "/equipe", rotulo: "Prefeituras", dica: "Lista as prefeituras clientes.", icone: "secretarias" },
            { href: "/equipe/uso", rotulo: "Uso do mês", dica: "Mostra o uso de cada prefeitura no mês.", icone: "painel" },
          ],
        ]}
        rodape={[]}
        sair={
          <form action={sair}>
            <BotaoEnviar
              aria-label="Sair"
              className="flex size-11 items-center justify-center rounded-full text-[#8cc5cf] hover:shadow-[0_0_0_1.5px_var(--marca-aqua)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aqua"
            >
              <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 4H5v16h4M16 8l4 4-4 4M20 12H9" />
              </svg>
            </BotaoEnviar>
          </form>
        }
      />
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <header className="flex min-h-11 flex-wrap items-center justify-between gap-3 pr-4 pl-2">
          <div>
            <div className="text-xs text-texto-suave">{trilha ?? "Equipe LicCONT"}</div>
            <h1 className="font-titulo text-[21px] font-bold">{titulo}</h1>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="hidden text-[13px] text-texto-suave sm:inline">Equipe LicCONT</span>
            <span aria-hidden className="flex size-9 items-center justify-center rounded-full bg-[#285a66] text-[13px] font-bold text-white">
              EL
            </span>
            <SeletorTema />
          </div>
        </header>
        <main className="flex min-w-0 flex-1 flex-col gap-4 pr-2">{children}</main>
      </div>
    </div>
  );
}
