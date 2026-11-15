"use client";

import { useActionState } from "react";
import { Botao } from "@/ui/botao";
import { Girando } from "@/ui/carregando";
import { exportarDados, type EstadoExportacao } from "./acoes";

export function FormularioExportar() {
  const [estado, enviar, pendente] = useActionState<EstadoExportacao>(() => exportarDados(), undefined);
  return (
    <form action={enviar} className="flex flex-col gap-3">
      <div>
        <Botao type="submit" disabled={pendente}>
          {pendente ? (
            <span className="inline-flex items-center gap-2">
              <Girando />
              Gerando o pacote…
            </span>
          ) : (
            "Gerar o pacote"
          )}
        </Botao>
      </div>
      {estado?.erro && (
        <p role="alert" className="text-sm text-erro">
          {estado.erro}
        </p>
      )}
      {estado?.aviso && (
        <div role="status" className="rounded-lg border border-linha bg-superficie-2 p-3 text-sm">
          <p>{estado.aviso}</p>
          {estado.links && (
            <ul className="mt-2 flex flex-col gap-1">
              {estado.links.map((l) => (
                <li key={l.url}>
                  <a href={l.url} className="font-semibold underline">
                    {l.rotulo}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </form>
  );
}
