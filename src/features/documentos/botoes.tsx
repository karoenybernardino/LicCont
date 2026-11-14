"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { conferirDocumento, desativarDocumento, linkDoPdf } from "./acoes";

const estilo =
  "inline-flex min-h-10 items-center justify-center rounded-lg border border-linha px-4 text-[13px] font-medium hover:border-destaque focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco disabled:opacity-60";

// "Baixar original": link assinado de 5 minutos, pedido na hora do clique.
export function BotaoBaixar({ documentoId }: { documentoId: string }) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  return (
    <>
      <button
        type="button"
        disabled={pendente}
        className={estilo}
        onClick={() =>
          iniciar(async () => {
            setErro(null);
            const r = await linkDoPdf(documentoId, true);
            if (r.url) window.location.assign(r.url);
            else setErro(r.erro ?? "Não foi possível baixar.");
          })
        }
      >
        Baixar original
      </button>
      {erro && <p role="alert" className="w-full text-sm text-erro">{erro}</p>}
    </>
  );
}

// Conferir e desativar: só aparecem para quem pode (o servidor e o banco conferem de novo).
export function BotoesGestao({ documentoId, conferido, ativo }: { documentoId: string; conferido: boolean; ativo: boolean }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [msg, setMsg] = useState<{ erro?: string; aviso?: string } | null>(null);
  function rodar(acao: () => Promise<{ erro?: string; aviso?: string }>) {
    iniciar(async () => {
      setMsg(await acao());
      router.refresh();
    });
  }
  return (
    <>
      <button type="button" disabled={pendente} className={estilo} onClick={() => rodar(() => conferirDocumento(documentoId, !conferido))}>
        {conferido ? "Remover conferência" : "Marcar como conferido"}
      </button>
      <button
        type="button"
        disabled={pendente}
        className={estilo}
        onClick={() => {
          if (ativo && !window.confirm("Desativar este documento? Ele deixa de aparecer na pesquisa, mas não é apagado.")) return;
          rodar(() => desativarDocumento(documentoId, !ativo));
        }}
      >
        {ativo ? "Desativar" : "Reativar"}
      </button>
      {msg?.erro && <p role="alert" className="w-full text-sm text-erro">{msg.erro}</p>}
      {msg?.aviso && <p role="status" className="w-full text-sm text-texto-suave">{msg.aviso}</p>}
    </>
  );
}
