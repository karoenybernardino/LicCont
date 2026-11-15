import type { ReactNode } from "react";
import { Etiqueta, Rotulo } from "@/features/estrutura/componentes";
import { Pilula } from "@/ui/canvas";
import type { Tom } from "@/features/auditoria/classificar";

// Botão de função das próximas fases: visível, mas desabilitado.
const BASE = "inline-flex items-center justify-center rounded-lg text-sm whitespace-nowrap cursor-not-allowed opacity-55";
const VARIANTES = {
  contorno: `${BASE} min-h-10 border border-linha px-5 font-medium text-texto`,
  primario: `${BASE} min-h-10 bg-[linear-gradient(135deg,#0e7490,#0f766e)] px-5 font-semibold text-white dark:bg-none dark:bg-[#2dd4bf] dark:text-[#0b2e3a]`,
  linha: `${BASE} min-h-[34px] border border-linha px-4 text-[13px] text-texto`,
} as const;

export function BotaoBreve({ children, variante = "contorno", className = "" }: { children: ReactNode; variante?: keyof typeof VARIANTES; className?: string }) {
  return (
    <button type="button" aria-disabled="true" title="Em breve" className={`${VARIANTES[variante]} ${className}`}>
      {children}
    </button>
  );
}

// Selo da ação ou da situação: cor do tom, ou contorno neutro.
export function Selo({ tom, children }: { tom: Tom; children: ReactNode }) {
  return tom === "neutro" ? <Etiqueta>{children}</Etiqueta> : <Pilula tom={tom}>{children}</Pilula>;
}

export const campo =
  "min-h-10 w-full rounded-lg border border-linha bg-campo px-3 text-sm text-texto outline-0 focus-visible:outline-2 focus-visible:outline-foco disabled:opacity-60";

export function CampoRotulado({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-[5px]">
      <Rotulo>{rotulo}</Rotulo>
      {children}
    </label>
  );
}

// Linha de texto simples das listas vazias.
export function LinhaVazia({ colunas, children }: { colunas: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={colunas} className="px-4 py-6 text-sm text-texto-suave">
        {children}
      </td>
    </tr>
  );
}
