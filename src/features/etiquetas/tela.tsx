"use client";

import { useMemo, useState, useTransition } from "react";
import { Painel } from "@/features/estrutura/componentes";
import { registrarImpressao } from "./acoes";
import { CartaoEtiqueta } from "./cartao";
import type { CaixaEtiqueta } from "./dados";
import { useOrigem } from "./origem";
import { TAMANHOS, type Tamanho } from "./esquemas";

const rotuloMaiusculo = "text-[11px] font-medium tracking-[.05em] text-texto-suave uppercase";
const botaoContorno =
  "inline-flex min-h-10 items-center justify-center rounded-lg border border-linha px-5 text-sm font-medium hover:border-destaque focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco disabled:cursor-not-allowed disabled:opacity-50";

// Só a folha de etiquetas sai na impressora; o resto da página fica oculto.
const CSS_IMPRESSAO = `
#folha-impressao{display:none}
@media print{
  body *{visibility:hidden}
  #folha-impressao,#folha-impressao *{visibility:visible}
  #folha-impressao{display:grid!important;position:absolute;left:0;top:0;width:100%;gap:4mm;grid-template-columns:repeat(auto-fill,minmax(var(--larg),1fr))}
}`;

export function TelaEtiquetas({ caixas, marcadas, podeImprimir }: { caixas: CaixaEtiqueta[]; marcadas: string[]; podeImprimir: boolean }) {
  const [tamanho, setTamanho] = useState<Tamanho>("media");
  const [busca, setBusca] = useState("");
  const [sel, setSel] = useState(() => new Set(marcadas.filter((id) => caixas.some((c) => c.id === id))));
  const origem = useOrigem();
  const [aviso, setAviso] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  const termo = busca.trim().toLocaleLowerCase("pt-BR");
  const visiveis = caixas.filter((c) => !termo || `${c.titulo} ${c.codigo}`.toLocaleLowerCase("pt-BR").includes(termo));
  const escolhidas = useMemo(() => caixas.filter((c) => sel.has(c.id)), [caixas, sel]);
  const alternar = (id: string) => setSel((s) => (s.has(id) ? new Set([...s].filter((x) => x !== id)) : new Set(s).add(id)));
  const n = escolhidas.length;

  function imprimir() {
    setAviso(null);
    iniciar(async () => {
      const r = await registrarImpressao({ caixas: escolhidas.map((c) => c.id), tamanho });
      if (r.erro) return setAviso(r.erro);
      if (r.aviso) setAviso(r.aviso);
      window.print();
    });
  }

  return (
    <>
      <style>{CSS_IMPRESSAO}</style>
      <div className="grid items-stretch gap-4 lg:grid-cols-[1fr_1.5fr]">
        <div className="flex min-w-0 flex-col gap-4">
          <Painel>
            <span className={rotuloMaiusculo}>Tamanho da etiqueta</span>
            <div role="radiogroup" aria-label="Tamanho da etiqueta" className="inline-flex w-fit gap-[3px] rounded-[13px] border border-linha bg-campo p-[3px]">
              {(Object.keys(TAMANHOS) as Tamanho[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={tamanho === t}
                  onClick={() => setTamanho(t)}
                  className={`min-h-[34px] rounded-[10px] border border-transparent px-4 text-[13px] hover:border-destaque focus-visible:outline-2 focus-visible:outline-foco ${tamanho === t ? "bg-[rgba(45,212,191,.18)] font-semibold dark:bg-[linear-gradient(90deg,rgba(45,212,191,.2),rgba(45,212,191,0))]" : ""}`}
                >
                  {TAMANHOS[t]}
                </button>
              ))}
            </div>
            <span className={rotuloMaiusculo}>Conteúdo</span>
            <ul className="flex flex-wrap gap-1.5">
              {["Rua · Módulo · Nível", "Caixa", "QR code", "Nome do documento"].map((t) => (
                <li key={t} className="rounded-xl border border-[#bfe0e5] bg-[#e3f3f5] px-2.5 py-[3px] text-xs font-semibold whitespace-nowrap text-[#0b4f5c] dark:border-linha dark:bg-[#0a1418] dark:text-texto-suave">{t}</li>
              ))}
            </ul>
          </Painel>

          <Painel>
            <div className="flex items-center justify-between">
              <h2 className="font-titulo text-[17px] font-bold">Caixas para etiquetar</h2>
              <span aria-live="polite" className="rounded-xl bg-[#ccfbf1] px-2.5 py-1 text-xs font-semibold whitespace-nowrap text-[#115e59] dark:bg-[#0e4a45] dark:text-[#7ff0df]">
                {n} {n === 1 ? "selecionada" : "selecionadas"}
              </span>
            </div>
            <label className="box-border flex min-h-10 items-center gap-2.5 rounded-[10px] border border-linha bg-campo px-3">
              <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-texto-suave"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
              <span className="sr-only">Buscar caixa ou documento</span>
              <input value={busca} onChange={(e) => setBusca(e.target.value)} maxLength={60} placeholder="Buscar caixa ou documento" className="min-w-0 flex-1 bg-transparent text-sm outline-0" />
            </label>
            <ul className="flex max-h-[330px] flex-col gap-1 overflow-auto pr-1.5">
              {visiveis.map((c) => {
                const ligada = sel.has(c.id);
                return (
                  <li key={c.id}>
                    <label className={`flex cursor-pointer items-center gap-3 rounded-[10px] px-3 py-2.5 hover:shadow-[inset_0_0_0_1.5px_var(--foco)] ${ligada ? "bg-[rgba(45,212,191,.18)] dark:bg-[linear-gradient(90deg,rgba(45,212,191,.2),rgba(45,212,191,0))]" : ""}`}>
                      <input type="checkbox" checked={ligada} onChange={() => alternar(c.id)} className="peer sr-only" />
                      <span aria-hidden className={`flex size-5 shrink-0 items-center justify-center rounded-md border-[1.5px] peer-focus-visible:outline-2 peer-focus-visible:outline-foco ${ligada ? "border-[#2dd4bf] bg-[#2dd4bf]" : "border-borda-campo dark:border-[#1b3a44]"}`}>
                        {ligada && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0b2e3a" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10" /></svg>}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-titulo text-[13px] font-semibold">{c.titulo}</span>
                        <span className="block font-mono text-[11px] font-medium text-texto-suave">{c.codigo}</span>
                      </span>
                    </label>
                  </li>
                );
              })}
              {visiveis.length === 0 && <li className="px-3 py-2.5 text-sm text-texto-suave">Nenhuma caixa encontrada.</li>}
            </ul>
          </Painel>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <Painel>
            <div className="flex items-center justify-between">
              <h2 className="font-titulo text-[17px] font-bold">Prévia da folha</h2>
              <span className="text-xs text-texto-suave">A4 · 2 colunas</span>
            </div>
            <div className="grid grid-cols-2 gap-2.5 rounded-xl bg-[#f4f7f8] p-3.5 dark:bg-[#0b1418]">
              {escolhidas.map((c) => <CartaoEtiqueta key={c.id} c={c} origem={origem} />)}
              {n === 0 && <p className="col-span-2 py-6 text-center text-sm text-[#3f5e66] dark:text-texto-suave">Marque as caixas para ver as etiquetas.</p>}
            </div>
          </Painel>
          {aviso && <p role="status" className="rounded-lg border border-linha bg-superficie-2 p-3 text-sm">{aviso}</p>}
          <div className="flex justify-end gap-2.5">
            <button type="button" disabled title="Salvar lista · em breve" className={botaoContorno}>Salvar lista</button>
            <button
              type="button"
              disabled={n === 0 || pendente || !podeImprimir}
              title={podeImprimir ? undefined : "Você não tem permissão para imprimir etiquetas"}
              onClick={imprimir}
              className="inline-flex min-h-10 items-center justify-center rounded-lg bg-[linear-gradient(135deg,#0e7490,#0f766e)] px-5 text-sm font-semibold text-white hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco disabled:cursor-not-allowed disabled:opacity-50 dark:bg-none dark:bg-[#2dd4bf] dark:text-[#0b2e3a]"
            >
              Imprimir {n} {n === 1 ? "etiqueta" : "etiquetas"}
            </button>
          </div>
        </div>
      </div>
      <div id="folha-impressao" aria-hidden style={{ ["--larg" as string]: tamanho === "media" ? "10cm" : "5cm" }}>
        {escolhidas.map((c) => (
          // Desenhada em 300 px e ampliada (media, 10 cm) ou reduzida (pequena, 5 cm) na impressão.
          <div key={c.id} style={{ width: 300, zoom: tamanho === "media" ? 1.26 : 0.63 }}>
            <CartaoEtiqueta c={c} origem={origem} />
          </div>
        ))}
      </div>
    </>
  );
}
