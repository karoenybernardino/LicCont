"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { alterarTipologia, atualizarGrupo, criarGrupo, criarTipologia, definirPapeis } from "./acoes";
import type { GrupoDoc, TipologiaDoc } from "@/features/demo/classificacao";

const PAPEIS = [["coordenador", "Coordenador"], ["operador", "Operador"], ["consulta", "Consulta"]] as const;
const campo = "min-h-10 min-w-0 flex-1 rounded-lg border border-borda-campo bg-campo px-3 text-sm text-texto focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-foco";
const botao = "inline-flex min-h-10 items-center justify-center rounded-lg border border-linha px-4 text-sm font-medium hover:border-destaque focus-visible:outline-2 focus-visible:outline-foco disabled:opacity-55";
const primario = "inline-flex min-h-10 items-center justify-center rounded-lg bg-[linear-gradient(135deg,#0e7490,#0f766e)] px-4 text-sm font-semibold text-white hover:opacity-90 focus-visible:outline-2 focus-visible:outline-foco disabled:opacity-55 dark:bg-none dark:bg-[#2dd4bf] dark:text-[#0b2e3a]";

type Retorno = { erro?: string; aviso?: string };

export function EditorGrupos({ grupos, tipologias, papeis }: { grupos: GrupoDoc[]; tipologias: (TipologiaDoc & { ativa: boolean })[]; papeis: Record<string, string[]> }) {
  const router = useRouter();
  const [msg, setMsg] = useState<Retorno | null>(null);
  const [pendente, iniciar] = useTransition();
  const [novoGrupo, setNovoGrupo] = useState("");
  const [novoRestrito, setNovoRestrito] = useState(false);
  const [novasTipologias, setNovasTipologias] = useState<Record<string, string>>({});

  const rodar = (f: () => Promise<Retorno>, limpar?: () => void) =>
    iniciar(async () => {
      const r = await f();
      setMsg(r);
      if (!r.erro) {
        limpar?.();
        router.refresh();
      }
    });

  return (
    <div className="flex flex-col gap-4">
      <div role="status" aria-live="polite" className="min-h-5 text-sm">
        {msg?.erro && <span role="alert" className="font-medium text-[#b91c1c] dark:text-[#fca5a5]">{msg.erro}</span>}
        {msg?.aviso && <span className="font-medium text-[#115e59] dark:text-[#7ff0df]">{msg.aviso}</span>}
      </div>
      <form
        className="flex flex-wrap items-center gap-2.5"
        onSubmit={(e) => {
          e.preventDefault();
          rodar(() => criarGrupo({ nome: novoGrupo, restrito: novoRestrito }), () => setNovoGrupo(""));
        }}
      >
        <input aria-label="Nome do novo grupo" value={novoGrupo} maxLength={80} onChange={(e) => setNovoGrupo(e.target.value)} placeholder="Novo grupo documental (ex.: Convênios)" className={campo} />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={novoRestrito} onChange={(e) => setNovoRestrito(e.target.checked)} className="size-4 accent-[#0e7490]" /> Restrito</label>
        <button type="submit" disabled={pendente} className={primario}>Cadastrar grupo</button>
      </form>
      <ul className="flex flex-col gap-3">
        {grupos.map((g) => {
          const liberados = papeis[g.id] ?? [];
          const dele = tipologias.filter((t) => t.grupoId === g.id);
          return (
            <li key={g.id} className={`flex flex-col gap-3 rounded-2xl border border-linha bg-superficie px-5 py-4 ${g.ativo ? "" : "opacity-60"}`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-base font-semibold">{g.nome}{!g.ativo && <span className="ml-2 text-xs font-normal text-texto-suave">(desativado)</span>}</h3>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={g.restrito} disabled={pendente} onChange={(e) => rodar(() => atualizarGrupo({ id: g.id, restrito: e.target.checked }))} className="size-4 accent-[#0e7490]" />
                    Restrito (LGPD)
                  </label>
                  <button type="button" disabled={pendente} onClick={() => rodar(() => atualizarGrupo({ id: g.id, ativo: !g.ativo }))} className={botao}>{g.ativo ? "Desativar" : "Reativar"}</button>
                </div>
              </div>
              {g.restrito && (
                <fieldset className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                  <legend className="mb-1 text-[11px] font-medium tracking-[.05em] text-texto-suave uppercase">Quem vê, além do administrador</legend>
                  {PAPEIS.map(([v, r]) => (
                    <label key={v} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={liberados.includes(v)}
                        disabled={pendente}
                        onChange={(e) => rodar(() => definirPapeis({ grupo: g.id, papeis: e.target.checked ? [...liberados, v] : liberados.filter((x) => x !== v) }))}
                        className="size-4 accent-[#0e7490]"
                      />
                      {r}
                    </label>
                  ))}
                </fieldset>
              )}
              <div className="flex flex-col gap-2">
                <span className="text-[11px] font-medium tracking-[.05em] text-texto-suave uppercase">Tipologias (opcionais ao cadastrar o documento)</span>
                <ul className="flex flex-wrap gap-2">
                  {dele.length === 0 && <li className="text-sm text-texto-suave">Nenhuma tipologia.</li>}
                  {dele.map((t) => (
                    <li key={t.id} className={`flex items-center gap-1.5 rounded-full border border-linha px-3 py-1 text-[13px] ${t.ativa ? "" : "line-through opacity-55"}`}>
                      {t.nome}
                      <button type="button" disabled={pendente} aria-label={`${t.ativa ? "Desativar" : "Reativar"} ${t.nome}`} onClick={() => rodar(() => alterarTipologia({ id: t.id, ativa: !t.ativa }))} className="text-texto-suave hover:text-texto">
                        {t.ativa ? "×" : "↺"}
                      </button>
                    </li>
                  ))}
                </ul>
                <form
                  className="flex flex-wrap items-center gap-2.5"
                  onSubmit={(e) => {
                    e.preventDefault();
                    rodar(() => criarTipologia({ grupo: g.id, nome: novasTipologias[g.id] ?? "" }), () => setNovasTipologias((n) => ({ ...n, [g.id]: "" })));
                  }}
                >
                  <input aria-label={`Nova tipologia em ${g.nome}`} value={novasTipologias[g.id] ?? ""} maxLength={80} onChange={(e) => setNovasTipologias((n) => ({ ...n, [g.id]: e.target.value }))} placeholder="Nova tipologia" className={campo} />
                  <button type="submit" disabled={pendente} className={botao}>Adicionar</button>
                </form>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
