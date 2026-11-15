"use client";

import { useState, useTransition } from "react";
import { botaoContorno } from "@/ui/canvas";
import { desfazerLote } from "./acoes";
import type { Lote } from "./dados";

const SITUACAO = { aberto: "Em andamento", gravado: "Importado", desfeito: "Desfeito" } as const;

// Lista de lotes com "Desfazer". Desfazer só desativa o que ainda está sem endereço.
export function ListaLotes({ lotes }: { lotes: Lote[] }) {
  const [pendente, iniciar] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [confirmar, setConfirmar] = useState<string | null>(null);

  function desfazer(id: string) {
    const f = new FormData();
    f.set("id", id);
    iniciar(async () => {
      const r = await desfazerLote(f);
      setMsg(r.erro ?? r.aviso ?? null);
      setConfirmar(null);
    });
  }

  if (!lotes.length) return <p className="text-sm text-texto-suave">Nenhum lote importado ainda.</p>;
  return (
    <div className="flex flex-col gap-2">
      {msg && (
        <p role="status" className="rounded-lg border border-linha px-3 py-2 text-sm">
          {msg}
        </p>
      )}
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="text-left">
            {["Lote", "Quando", "Documentos", "Situação", ""].map((c) => (
              <th key={c} className="px-2 py-2 text-[11px] font-semibold uppercase">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lotes.map((l) => (
            <tr key={l.id} className="border-t border-linha">
              <td className="px-2 py-2 font-medium">{l.codigo}</td>
              <td className="px-2 py-2">{new Date(l.criado_em).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}</td>
              <td className="px-2 py-2">{l.gravados.toLocaleString("pt-BR")}</td>
              <td className="px-2 py-2">{SITUACAO[l.situacao]}</td>
              <td className="px-2 py-2 text-right">
                {l.situacao === "gravado" &&
                  (confirmar === l.id ? (
                    <span className="inline-flex items-center gap-2">
                      <span>Desativar os que ainda estão sem endereço?</span>
                      <button type="button" disabled={pendente} className={botaoContorno} onClick={() => desfazer(l.id)}>
                        Sim, desfazer
                      </button>
                      <button type="button" className={botaoContorno} onClick={() => setConfirmar(null)}>
                        Não
                      </button>
                    </span>
                  ) : (
                    <button type="button" className={botaoContorno} onClick={() => setConfirmar(l.id)}>
                      Desfazer
                    </button>
                  ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
