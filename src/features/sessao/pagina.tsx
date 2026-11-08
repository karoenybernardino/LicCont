import type { ReactNode } from "react";
import Link from "next/link";
import { CabecalhoSistema } from "./cabecalho";
import { SeletorSecretaria } from "./seletor-secretaria";
import type { Secretaria, Usuario } from "./dal";

const menu = [
  { href: "/inicio", rotulo: "Início", admin: false },
  { href: "/estrutura", rotulo: "Estrutura física", admin: false },
  { href: "/usuarios", rotulo: "Usuários e perfis", admin: true },
  { href: "/secretarias", rotulo: "Secretarias", admin: true },
] as const;

// Moldura das telas do sistema: cabeçalho, menu e conteúdo.
// "trilha" é a linha pequena acima do título (como no canvas: "Acervo · Galpão").
export function PaginaSistema({
  usuario,
  secretaria,
  titulo,
  trilha,
  acoes,
  larga = false,
  children,
}: {
  usuario: Usuario;
  secretaria: Secretaria;
  titulo: string;
  trilha?: string;
  acoes?: ReactNode;
  larga?: boolean;
  children: ReactNode;
}) {
  return (
    <>
      <CabecalhoSistema>
        <SeletorSecretaria usuario={usuario} atual={secretaria} />
      </CabecalhoSistema>
      <nav aria-label="Menu do sistema" className="border-b border-linha px-4 sm:px-6">
        <ul className="flex flex-wrap gap-4 py-2 text-sm">
          {menu
            .filter((item) => !item.admin || usuario.administrador)
            .map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-destaque underline-offset-2 hover:underline">
                  {item.rotulo}
                </Link>
              </li>
            ))}
        </ul>
      </nav>
      <main
        className={`mx-auto flex w-full flex-1 flex-col gap-6 px-4 py-8 sm:px-6 ${larga ? "max-w-7xl gap-4" : "max-w-5xl"}`}
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            {trilha && <p className="text-xs text-texto-suave">{trilha}</p>}
            <h1 className={larga ? "text-[21px] font-bold" : "text-2xl"}>{titulo}</h1>
          </div>
          {acoes}
        </div>
        {children}
      </main>
    </>
  );
}
