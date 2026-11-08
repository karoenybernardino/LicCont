"use client";

import type { ButtonHTMLAttributes } from "react";
import { useFormStatus } from "react-dom";
import { Girando } from "./carregando";

// Botão de envio que mostra o indicador enquanto o formulário pai é enviado.
export function BotaoEnviar({ children, className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`inline-flex items-center gap-2 ${className}`} {...props}>
      {pending && <Girando />}
      {children}
    </button>
  );
}
