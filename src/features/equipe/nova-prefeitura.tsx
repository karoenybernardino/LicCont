"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Campo } from "@/ui/campo";
import { Girando } from "@/ui/carregando";
import { CabecalhoPainel, botaoPrimario } from "@/ui/canvas";
import type { EstadoAcao } from "@/ui/formulario";
import { Painel } from "@/features/estrutura/componentes";
import { criarPrefeitura } from "@/features/prefeituras/acoes";

const icone = (d: string) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);
const campo = "!min-h-10 !rounded-lg !text-sm";
const PASSOS = [
  "A base da prefeitura é criada, separada das outras.",
  "A própria prefeitura cadastra as secretarias dela no primeiro acesso.",
  "O administrador, se informado, entra com uma senha provisória mostrada ao salvar.",
  "Tudo fica registrado na auditoria.",
];

// Quadro EquipeNovaPrefeitura: dados do órgão, primeiro administrador e o que acontece ao salvar.
export function NovaPrefeitura() {
  const [estado, enviar, pendente] = useActionState<EstadoAcao, FormData>(criarPrefeitura, undefined);
  return (
    <form action={enviar} className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex flex-col gap-4">
        <Painel>
          <CabecalhoPainel icone={icone("M4 21V8l8-5 8 5v13M9 21v-6h6v6")} titulo="Dados do órgão" subtitulo="Como aparece no login e nos documentos" />
          <Campo rotulo="Nome do órgão" name="nome" required maxLength={200} placeholder="Prefeitura Municipal de …" className={campo} />
          <Campo rotulo="CNPJ" name="cnpj" inputMode="numeric" required placeholder="00.000.000/0000-00" className={campo} />
        </Painel>
        <Painel>
          <CabecalhoPainel icone={icone("M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0")} titulo="Primeiro administrador" subtitulo="Opcional agora. Pode ser incluído depois." />
          <div className="grid gap-3.5 sm:grid-cols-2">
            <Campo rotulo="Nome completo" name="admin_nome" maxLength={200} placeholder="Nome do servidor" className={campo} />
            <Campo rotulo="E-mail institucional" name="admin_email" type="email" autoComplete="off" placeholder="nome@prefeitura.gov.br" className={campo} />
          </div>
          <p className="text-[12.5px] text-texto-suave">Ele entra com uma senha provisória, mostrada uma única vez ao salvar, e cria a própria senha no primeiro acesso.</p>
        </Painel>
      </div>
      <Painel>
        <span className="text-[11px] font-medium tracking-[.05em] text-texto-suave uppercase">O que acontece ao salvar</span>
        <ol className="flex flex-col gap-3">
          {PASSOS.map((t, i) => (
            <li key={t} className="flex items-start gap-3 text-[13px] leading-[19px]">
              <span aria-hidden className="flex size-[22px] shrink-0 items-center justify-center rounded-full bg-[rgba(14,116,144,.12)] font-mono text-xs font-medium text-destaque dark:bg-[rgba(45,212,191,.15)]">{i + 1}</span>
              {t}
            </li>
          ))}
        </ol>
        {estado?.erro && <p role="alert" className="text-sm text-erro">{estado.erro}</p>}
        {estado?.aviso && (
          <div role="status" className="rounded-lg border border-linha bg-superficie-2 p-3 text-sm">
            <p>{estado.aviso}</p>
            {estado.senha && (
              <p className="mt-2">
                Senha provisória: <code data-testid="senha-provisoria" className="font-mono font-semibold">{estado.senha}</code>
              </p>
            )}
          </div>
        )}
        <div className="flex flex-wrap gap-2.5">
          <button type="submit" disabled={pendente} className={`${botaoPrimario} disabled:opacity-50`}>
            {pendente ? <span className="inline-flex items-center gap-2"><Girando />Criando…</span> : "Salvar e criar base"}
          </button>
          <Link href="/equipe" className="inline-flex min-h-10 items-center justify-center rounded-lg border border-linha px-5 text-sm font-medium hover:border-destaque focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco">
            Cancelar
          </Link>
        </div>
      </Painel>
    </form>
  );
}
