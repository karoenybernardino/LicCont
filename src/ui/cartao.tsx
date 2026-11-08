import type { HTMLAttributes } from "react";

export function Cartao({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-[14px] border border-linha bg-superficie p-7 ${className}`}
      {...props}
    />
  );
}
