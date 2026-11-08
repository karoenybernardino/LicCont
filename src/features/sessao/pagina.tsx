import type { ReactNode } from "react";
import Link from "next/link";
import { CabecalhoSistema } from "./cabecalho";
import { SeletorSecretaria } from "./seletor-secretaria";
import type { Secretaria, Usuario } from "./dal";

const menuAdmin = [
  { href: "/inicio", rotulo: "Início" },
  { href: "/usuarios", rotulo: "Usuários e perfis" },
  { href: "/secretarias", rotulo: "Secretarias" },
] as const;

// Moldura das telas do sistema: cabeçalho, menu do administrador e conteúdo.
export function PaginaSistema({
  usuario,
  secretaria,
  titulo,
  children,
}: {
  usuario: Usuario;
  secretaria: Secretaria;
  titulo: string;
  children: ReactNode;
}) {
  return (
    <>
      <CabecalhoSistema>
        <SeletorSecretaria usuario={usuario} atual={secretaria} />
      </CabecalhoSistema>
      {usuario.administrador && (
        <nav aria-label="Administração" className="border-b border-linha px-4 sm:px-6">
          <ul className="flex flex-wrap gap-4 py-2 text-sm">
            {menuAdmin.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-destaque underline-offset-2 hover:underline">
                  {item.rotulo}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
        <h1 className="text-2xl">{titulo}</h1>
        {children}
      </main>
    </>
  );
}
