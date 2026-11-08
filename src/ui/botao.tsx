import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: "principal" | "secundario";
};

const estilos = {
  principal: "bg-destaque text-destaque-texto hover:opacity-90",
  secundario: "border border-linha text-texto hover:border-destaque",
};

export function Botao({ variante = "principal", type = "button", className = "", ...props }: Props) {
  return (
    <button
      type={type}
      className={`rounded-lg px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco disabled:opacity-50 ${estilos[variante]} ${className}`}
      {...props}
    />
  );
}
