import { useId, type InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  rotulo: string;
  erro?: string;
};

export function Campo({ rotulo, erro, id, className = "", ...props }: Props) {
  const gerado = useId();
  const idCampo = id ?? gerado;
  const idErro = `${idCampo}-erro`;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={idCampo} className="text-sm font-medium text-texto">
        {rotulo}
      </label>
      <input
        id={idCampo}
        aria-invalid={erro ? true : undefined}
        aria-describedby={erro ? idErro : undefined}
        className={`rounded-lg border border-linha bg-superficie px-3 py-2 text-texto focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-foco aria-invalid:border-erro ${className}`}
        {...props}
      />
      {erro && (
        <p id={idErro} className="text-sm text-erro">
          {erro}
        </p>
      )}
    </div>
  );
}
