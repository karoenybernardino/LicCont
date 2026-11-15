import type { ReactNode } from "react";
import { Logo } from "@/ui/logo";
import { SeletorTema } from "@/ui/seletor-tema";

// Moldura das telas de login (canvas "Login" e "Login 1").
export function MolduraLogin({ children }: { children: ReactNode }) {
  return (
    <main className="relative flex flex-1 flex-col items-center justify-center gap-7 px-4 py-12">
      <div className="absolute right-4 top-4">
        <SeletorTema />
      </div>
      <div className="flex flex-col items-center gap-3.5">
        <Logo empilhada className="text-[34px]" />
        <p className="text-sm text-texto-suave">Arquivo de licitações e contratos</p>
      </div>
      <div className="w-full max-w-[400px]">{children}</div>
      <p className="text-center text-[13px] leading-5 text-texto-suave">
        Acesso restrito a servidores autorizados do órgão.
        <br />
        Cada ação fica registrada na auditoria.
      </p>
    </main>
  );
}

export function Aviso({ children, papel = "status" }: { children: ReactNode; papel?: "status" | "alert" }) {
  return (
    <p role={papel} className={`text-sm ${papel === "alert" ? "text-erro" : "text-texto-suave"}`}>
      {children}
    </p>
  );
}
