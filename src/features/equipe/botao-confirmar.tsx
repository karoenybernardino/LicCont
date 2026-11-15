"use client";

import type { ReactNode } from "react";

// Botão de envio que pede confirmação antes (ação que tira acesso de alguém).
export function BotaoConfirmar({ aviso, className, children }: { aviso: string; className?: string; children: ReactNode }) {
  return (
    <button type="submit" className={className} onClick={(e) => { if (!window.confirm(aviso)) e.preventDefault(); }}>
      {children}
    </button>
  );
}
