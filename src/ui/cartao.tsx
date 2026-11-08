import type { HTMLAttributes } from "react";

export function Cartao({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-2xl border border-linha bg-superficie p-6 shadow-sm ${className}`}
      {...props}
    />
  );
}
