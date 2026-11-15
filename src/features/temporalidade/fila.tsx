"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { ProntoEliminacao } from "@/features/movimento/tipos";
import { gerarTermo } from "./acoes";

const BASE = "inline-flex min-h-10 w-full items-center justify-center rounded-lg text-sm whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco disabled:cursor-not-allowed disabled:opacity-55";
const PRIMARIO = `${BASE} bg-[linear-gradient(135deg,#0e7490,#0f766e)] px-5 font-semibold text-white dark:bg-none dark:bg-[#2dd4bf] dark:text-[#0b2e3a]`;
const CONTORNO = `${BASE} border border-linha px-5 font-medium text-texto`;

// Lista "Prontos para eliminação": marca os documentos aprovados pela comissão e
// gera o termo em rascunho. Quem não gera termo vê a lista sem caixas de marcar.
export function FilaEliminacao({ prontos, podeGerar }: { prontos: ProntoEliminacao[]; podeGerar: boolean }) {
  const router = useRouter();
  const [marcados, setMarcados] = useState(() => new Set(prontos.filter((p) => p.marcado).map((p) => p.id)));
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  const alternar = (id: string) =>
    setMarcados((atual) => {
      const novo = new Set(atual);
      if (!novo.delete(id)) novo.add(id);
      return novo;
    });

  const gerar = (imprimir: boolean) =>
    iniciar(async () => {
      setErro(null);
      setAviso(null);
      const r = await gerarTermo({ documentos: [...marcados], observacao: null });
      if (r.erro) return setErro(r.erro);
      if (r.aviso) return setAviso(r.aviso);
      if (imprimir) window.open(`/temporalidade/termo/${r.id}/arquivo?formato=pdf`, "_blank", "noopener");
      router.push(`/temporalidade/termo/${r.id}`);
    });

  return (
    <>
      <ul className="flex flex-col gap-1">
        {prontos.map((d) => {
          const marcado = marcados.has(d.id);
          const conteudo = (
            <>
              <span
                aria-hidden
                className={`flex size-5 shrink-0 items-center justify-center rounded-md border-[1.5px] ${marcado ? "border-[#2dd4bf] bg-[#2dd4bf]" : "border-linha"}`}
              >
                {marcado && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0b2e3a" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12.5l4.5 4.5L19 7" />
                  </svg>
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{d.titulo}</p>
                <p className="font-mono text-xs font-medium text-texto-suave">{d.caixa}</p>
              </div>
              <span className="text-xs whitespace-nowrap text-texto-suave">venceu {d.venceu}</span>
            </>
          );
          const classe = `flex items-center gap-3 rounded-[10px] px-3 py-2.5 ${marcado ? "bg-[linear-gradient(90deg,rgba(45,212,191,.2),rgba(45,212,191,0))]" : ""}`;
          return (
            <li key={d.id}>
              {podeGerar ? (
                <label className={`${classe} cursor-pointer`}>
                  <input type="checkbox" className="sr-only" checked={marcado} onChange={() => alternar(d.id)} aria-label={`Marcar ${d.titulo}`} />
                  {conteudo}
                </label>
              ) : (
                <div className={classe}>{conteudo}</div>
              )}
            </li>
          );
        })}
      </ul>
      <p className="text-xs leading-[18px] text-texto-suave">
        Marque os documentos aprovados pela comissão. O sistema gera a listagem e o termo de eliminação, e registra tudo na auditoria.
      </p>
      {erro && (
        <p role="alert" className="text-sm text-erro">
          {erro}
        </p>
      )}
      {aviso && (
        <p role="status" className="rounded-lg border border-linha bg-superficie-2 p-3 text-sm">
          {aviso}
        </p>
      )}
      {podeGerar && (
        <>
          <button type="button" className={`${PRIMARIO} w-full`} disabled={pendente || marcados.size === 0} onClick={() => gerar(false)}>
            Gerar termo de eliminação
          </button>
          <button type="button" className={`${CONTORNO} w-full`} disabled={pendente || marcados.size === 0} onClick={() => gerar(true)}>
            Imprimir listagem
          </button>
        </>
      )}
    </>
  );
}
