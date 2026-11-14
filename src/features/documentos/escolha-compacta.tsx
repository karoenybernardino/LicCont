"use client";

// Filtro em formato de chip (quadro "painel do documento"): é um <select> de
// verdade e envia o formulário assim que a pessoa escolhe.
export function EscolhaCompacta({
  nome,
  rotulo,
  valor,
  opcoes,
}: {
  nome: string;
  rotulo: string;
  valor: string | null;
  opcoes: [string, string][];
}) {
  return (
    <label className="relative block min-w-0">
      <span className="sr-only">{rotulo}</span>
      <select
        name={nome}
        defaultValue={valor ?? ""}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="h-[34px] w-full max-w-full appearance-none truncate rounded-lg border border-borda-campo bg-campo pr-5 pl-2 text-[12.5px] font-medium text-texto hover:border-[#0e7490] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-foco"
      >
        <option value="">{rotulo}</option>
        {opcoes.map(([k, v]) => (
          <option key={k} value={k}>
            {v}
          </option>
        ))}
      </select>
      <svg
        aria-hidden
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2"
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
    </label>
  );
}
