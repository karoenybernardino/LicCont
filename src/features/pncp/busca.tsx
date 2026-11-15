"use client";

import { useState, useTransition } from "react";
import { botaoContorno, botaoPrimario } from "@/ui/canvas";
import { Painel, TituloPainel } from "@/features/estrutura/componentes";
import { CampoRotulado, campo } from "@/features/movimento/ui";
import { anexarDoPncp, buscarArquivosPncp } from "./acoes";
import type { ArquivoPncp } from "./cliente";

// Buscar PDF no PNCP: CNPJ do órgão, ano e número da compra; escolhe um arquivo e anexa.
export function BuscaPncp({ documento, cnpjInicial, anoInicial }: { documento: string; cnpjInicial: string; anoInicial: number }) {
  const [pendente, iniciar] = useTransition();
  const [cnpj, setCnpj] = useState(cnpjInicial);
  const [ano, setAno] = useState(String(anoInicial));
  const [sequencial, setSequencial] = useState("");
  const [arquivos, setArquivos] = useState<ArquivoPncp[]>([]);
  const [escolhido, setEscolhido] = useState<number | null>(null);
  const [msg, setMsg] = useState<{ texto: string; erro: boolean } | null>(null);

  const compra = { cnpj, ano, sequencial };
  function buscar() {
    setMsg(null);
    iniciar(async () => {
      const r = await buscarArquivosPncp({ documento, compra });
      setArquivos(r.arquivos ?? []);
      setEscolhido(null);
      if (r.erro) setMsg({ texto: r.erro, erro: true });
    });
  }
  function anexar() {
    const a = arquivos.find((x) => x.sequencial === escolhido);
    if (!a) return;
    iniciar(async () => {
      const r = await anexarDoPncp({ documento, compra, sequencial: a.sequencial, nome: a.titulo });
      setMsg({ texto: r.erro ?? r.aviso ?? "Feito.", erro: !!r.erro });
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <Painel>
        <TituloPainel>Buscar no PNCP</TituloPainel>
        <p className="text-sm text-texto-suave">Este documento ainda não tem PDF. O TCE não entrega o arquivo. Preenchido com os dados do documento; pode corrigir antes de buscar.</p>
        <div className="grid gap-3 md:grid-cols-3">
          <CampoRotulado rotulo="CNPJ do órgão">
            <input className={campo} inputMode="numeric" value={cnpj} onChange={(e) => setCnpj(e.target.value)} />
          </CampoRotulado>
          <CampoRotulado rotulo="Ano">
            <input className={campo} inputMode="numeric" value={ano} onChange={(e) => setAno(e.target.value)} />
          </CampoRotulado>
          <CampoRotulado rotulo="Número da compra">
            <input className={campo} inputMode="numeric" value={sequencial} onChange={(e) => setSequencial(e.target.value)} />
          </CampoRotulado>
        </div>
        <button type="button" disabled={pendente || !sequencial} className={`${botaoPrimario} w-fit disabled:opacity-55`} onClick={buscar}>
          {pendente ? "Aguarde…" : "Buscar"}
        </button>
      </Painel>

      {arquivos.length > 0 && (
        <Painel>
          <TituloPainel>Arquivos encontrados</TituloPainel>
          <fieldset className="flex flex-col gap-1">
            <legend className="sr-only">Escolha o arquivo a anexar</legend>
            {arquivos.map((a) => (
              <label key={a.sequencial} className="flex items-center gap-3 border-t border-linha px-2 py-2.5 text-sm">
                <input type="radio" name="arquivo" checked={escolhido === a.sequencial} onChange={() => setEscolhido(a.sequencial)} />
                <span className="flex-1">{a.titulo}</span>
                <span className="text-xs text-texto-suave">{a.tipo}</span>
              </label>
            ))}
          </fieldset>
          <p className="text-sm text-texto-suave">Os arquivos vêm do Portal Nacional de Contratações Públicas, aberto ao público. Confira se é a compra certa antes de anexar. Um arquivo por vez.</p>
          <div className="flex gap-3">
            <button type="button" disabled={pendente || escolhido === null} className={`${botaoPrimario} disabled:opacity-55`} onClick={anexar}>
              {pendente ? "Anexando…" : "Anexar ao documento"}
            </button>
            <button type="button" className={botaoContorno} onClick={() => setArquivos([])}>
              Cancelar
            </button>
          </div>
        </Painel>
      )}

      {msg && (
        <p role={msg.erro ? "alert" : "status"} className={`text-sm ${msg.erro ? "text-[#b91c1c] dark:text-[#f87171]" : ""}`}>
          {msg.texto}
        </p>
      )}
    </div>
  );
}
