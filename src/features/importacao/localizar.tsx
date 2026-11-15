"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { botaoPrimario } from "@/ui/canvas";
import { Painel, Rotulo, TituloPainel } from "@/features/estrutura/componentes";
import { campo } from "@/features/movimento/ui";
import { EscolhaCaixa } from "./escolha-caixa";
import type { OpcoesEstrutura } from "@/features/documentos/formulario";
import { localizarDocumentos } from "./acoes";
import type { SemEndereco } from "./dados";

// Fila "Documentos sem endereço": escolhe vários e manda para uma caixa.
export function Localizar({
  documentos,
  estrutura,
  secretarias,
  filtro,
}: {
  documentos: SemEndereco[];
  estrutura: OpcoesEstrutura;
  secretarias: { id: string; nome: string }[];
  filtro: string;
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const [caixa, setCaixa] = useState("");
  const [msg, setMsg] = useState<{ texto: string; erro: boolean } | null>(null);

  const alternar = (id: string) =>
    setMarcados((s) => {
      const n = new Set(s);
      if (!n.delete(id)) n.add(id);
      return n;
    });
  const todos = documentos.length > 0 && marcados.size === documentos.length;

  function localizar() {
    iniciar(async () => {
      const r = await localizarDocumentos({ ids: [...marcados], caixa });
      if (r.erro) return setMsg({ texto: r.erro, erro: true });
      setMsg({ texto: r.aviso ?? "Feito.", erro: false });
      if (r.movidos) {
        setMarcados(new Set());
        router.refresh();
      }
    });
  }

  return (
    <div className="grid items-start gap-4 xl:grid-cols-[1fr_340px]">
      <Painel>
        <TituloPainel>Documentos sem endereço</TituloPainel>
        <form className="flex flex-wrap gap-2" action="/cadastro/localizar" aria-label="Filtrar por secretaria">
          <select
            name="secretaria"
            defaultValue={filtro}
            className={`${campo} max-w-[260px]`}
            aria-label="Secretaria"
            onChange={(e) => e.currentTarget.form?.requestSubmit()}
          >
            <option value="">Todas as secretarias</option>
            {secretarias.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome}
              </option>
            ))}
          </select>
        </form>
        <p className="text-sm text-texto-suave">
          {documentos.length.toLocaleString("pt-BR")} sem endereço · {marcados.size} selecionados
        </p>
        <div className="sc max-h-[460px] overflow-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="text-left">
                <th className="w-10 px-2 py-2">
                  <input
                    type="checkbox"
                    aria-label="Selecionar todos"
                    checked={todos}
                    onChange={() => setMarcados(todos ? new Set() : new Set(documentos.map((d) => d.id)))}
                  />
                </th>
                {["Documento", "Ano", "Situação"].map((c) => (
                  <th key={c} className="px-2 py-2 text-[11px] font-semibold uppercase">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {documentos.map((d) => (
                <tr key={d.id} className="border-t border-linha">
                  <td className="px-2 py-2">
                    <input type="checkbox" aria-label={`Selecionar ${d.titulo}`} checked={marcados.has(d.id)} onChange={() => alternar(d.id)} />
                  </td>
                  <td className="px-2 py-2">
                    <div className="font-medium">{d.titulo}</div>
                    <div className="max-w-[420px] truncate text-xs text-texto-suave">{d.objeto}</div>
                  </td>
                  <td className="px-2 py-2">{d.ano}</td>
                  <td className="px-2 py-2">Sem endereço</td>
                </tr>
              ))}
              {!documentos.length && (
                <tr>
                  <td colSpan={4} className="px-2 py-6 text-center text-texto-suave">
                    Nenhum documento sem endereço.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Painel>

      <Painel>
        <TituloPainel>Onde estão estes {marcados.size || ""} documentos?</TituloPainel>
        <p className="text-sm text-texto-suave">Escolha a caixa. Os selecionados ficam no mesmo endereço.</p>
        <EscolhaCaixa estrutura={estrutura} aoMudar={setCaixa} />
        {msg && (
          <p role={msg.erro ? "alert" : "status"} className={`text-sm ${msg.erro ? "text-[#b91c1c] dark:text-[#f87171]" : ""}`}>
            {msg.texto}
          </p>
        )}
        <button type="button" disabled={!marcados.size || !caixa || pendente} className={`${botaoPrimario} disabled:opacity-55`} onClick={localizar}>
          {pendente ? "Localizando…" : `Localizar ${marcados.size || ""} documentos`}
        </button>
        <Rotulo>Máximo de 200 por vez</Rotulo>
      </Painel>
    </div>
  );
}
