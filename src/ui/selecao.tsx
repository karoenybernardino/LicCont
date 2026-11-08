import { useId, type SelectHTMLAttributes } from "react";

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  rotulo: string;
  ajuda?: string;
};

// Lista de escolha com o mesmo visual do Campo.
export function Selecao({ rotulo, ajuda, id, className = "", children, ...props }: Props) {
  const gerado = useId();
  const idCampo = id ?? gerado;
  const idAjuda = `${idCampo}-ajuda`;

  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={idCampo}
        className="text-xs font-medium uppercase tracking-[0.04em] text-texto-suave"
      >
        {rotulo}
      </label>
      <select
        id={idCampo}
        aria-describedby={ajuda ? idAjuda : undefined}
        className={`min-h-12 rounded-lg border border-borda-campo bg-campo px-3.5 text-[15px] text-texto focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-foco ${className}`}
        {...props}
      >
        {children}
      </select>
      {ajuda && (
        <p id={idAjuda} className="text-xs text-texto-suave">
          {ajuda}
        </p>
      )}
    </div>
  );
}
