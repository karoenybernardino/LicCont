"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { botaoContorno, botaoPrimario } from "@/ui/canvas";
import { Painel, TituloPainel } from "@/features/estrutura/componentes";
import { CampoRotulado, campo } from "@/features/movimento/ui";
import { EscolhaCaixa } from "@/features/importacao/escolha-caixa";
import type { OpcoesEstrutura } from "@/features/documentos/formulario";
import { confirmarImportado, decidirDuplicado } from "./acoes";
import type { ItemFila } from "./dados";

const real = (v: number | null) => (v === null ? "" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }));

// Fila "Importados do TCE a conferir": lista à esquerda, painel de conferência à direita.
export function PainelFila({
  itens,
  duplicados,
  estrutura,
  secretarias,
  administrador,
}: {
  itens: ItemFila[];
  duplicados: ItemFila[];
  estrutura: OpcoesEstrutura;
  secretarias: { id: string; nome: string }[];
  administrador: boolean;
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [filtro, setFiltro] = useState<"todos" | "licitacao" | "contrato">("todos");
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [secretaria, setSecretaria] = useState("");
  const [caixa, setCaixa] = useState("");
  const [msg, setMsg] = useState<{ texto: string; erro: boolean } | null>(null);

  const lista = itens.filter((i) => filtro === "todos" || i.tipo === filtro);
  const atual = itens.find((i) => i.id === selecionado) ?? lista[0] ?? null;
  const conta = (t: "licitacao" | "contrato") => itens.filter((i) => i.tipo === t).length;

  function resultado(r: { erro?: string; aviso?: string }) {
    setMsg({ texto: r.erro ?? r.aviso ?? "Feito.", erro: !!r.erro });
    if (!r.erro) router.refresh();
  }
  function confirmar() {
    if (!atual) return;
    const f = new FormData();
    f.set("documento", atual.id);
    f.set("secretaria", secretaria || atual.secretariaId);
    f.set("caixa", caixa);
    iniciar(async () => resultado(await confirmarImportado(f)));
  }
  function decidir(id: string, decisao: "juntar" | "manter") {
    const f = new FormData();
    f.set("id", id);
    f.set("decisao", decisao);
    iniciar(async () => resultado(await decidirDuplicado(f)));
  }

  return (
    <div className="grid items-start gap-4 xl:grid-cols-[1fr_380px]">
      <div className="flex flex-col gap-4">
        <Painel>
          <TituloPainel>Importados do TCE</TituloPainel>
          <div role="tablist" aria-label="Tipo" className="flex gap-2 text-sm">
            {(
              [
                ["todos", `Todos ${itens.length}`],
                ["licitacao", `Licitações ${conta("licitacao")}`],
                ["contrato", `Contratos ${conta("contrato")}`],
              ] as const
            ).map(([k, r]) => (
              <button key={k} type="button" role="tab" aria-selected={filtro === k} className={`rounded-lg border px-3 py-1 ${filtro === k ? "border-destaque" : "border-linha"}`} onClick={() => setFiltro(k)}>
                {r}
              </button>
            ))}
          </div>
          <ul className="sc max-h-[460px] overflow-auto">
            {lista.map((i) => (
              <li key={i.id}>
                <button
                  type="button"
                  aria-current={atual?.id === i.id}
                  className={`flex w-full items-center justify-between gap-3 border-t border-linha px-2 py-3 text-left ${atual?.id === i.id ? "bg-destaque/10" : ""}`}
                  onClick={() => {
                    setSelecionado(i.id);
                    setSecretaria(i.secretariaId);
                  }}
                >
                  <span>
                    <span className="block text-sm font-medium">{i.titulo}</span>
                    <span className="block max-w-[420px] truncate text-xs text-texto-suave">
                      {i.objeto} {i.valor !== null && `· ${real(i.valor)}`}
                    </span>
                  </span>
                  <span className="text-xs text-texto-suave">A conferir</span>
                </button>
              </li>
            ))}
            {!lista.length && <li className="px-2 py-6 text-center text-sm text-texto-suave">Nada por conferir.</li>}
          </ul>
        </Painel>

        {duplicados.length > 0 && (
          <Painel>
            <TituloPainel>Possíveis duplicados</TituloPainel>
            <p className="text-sm text-texto-suave">Já existe um documento com este número. Juntar põe o código do TCE no que já existe, sem mudar nada dele. Manter separado descarta o registro do TCE.</p>
            <ul>
              {duplicados.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-linha py-3 text-sm">
                  <span>
                    <strong>{d.titulo}</strong> {d.objeto && <span className="text-texto-suave">· {d.objeto}</span>}
                  </span>
                  {administrador && (
                    <span className="flex gap-2">
                      <button type="button" disabled={pendente} className={botaoContorno} onClick={() => decidir(d.id, "juntar")}>
                        Juntar
                      </button>
                      <button type="button" disabled={pendente} className={botaoContorno} onClick={() => decidir(d.id, "manter")}>
                        Manter separado
                      </button>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </Painel>
        )}
      </div>

      <Painel>
        {atual ? (
          <>
            <TituloPainel>{atual.titulo}</TituloPainel>
            <p className="text-xs text-texto-suave">Importado do TCE</p>
            <p className="text-sm">{atual.objeto}</p>
            {atual.valor !== null && <p className="text-sm">Valor: {real(atual.valor)}</p>}
            <p className="text-sm text-texto-suave">Dados vindos do TCE-CE. Para corrigir, edite depois de confirmar.</p>
            <CampoRotulado rotulo="Secretaria">
              <select className={campo} value={secretaria || atual.secretariaId} onChange={(e) => setSecretaria(e.target.value)}>
                {secretarias.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nome}
                  </option>
                ))}
              </select>
            </CampoRotulado>
            <p className="text-sm text-texto-suave">Onde está guardado (pode deixar para depois e localizar mais tarde):</p>
            <EscolhaCaixa estrutura={estrutura} aoMudar={setCaixa} />
            {msg && (
              <p role={msg.erro ? "alert" : "status"} className={`text-sm ${msg.erro ? "text-[#b91c1c] dark:text-[#f87171]" : ""}`}>
                {msg.texto}
              </p>
            )}
            <button type="button" disabled={pendente} className={`${botaoPrimario} disabled:opacity-55`} onClick={confirmar}>
              {pendente ? "Confirmando…" : "Confirmar e tirar da fila"}
            </button>
          </>
        ) : (
          <p className="text-sm text-texto-suave">Selecione um documento da lista.</p>
        )}
      </Painel>
    </div>
  );
}
