"use client";

import { useRef, useState } from "react";
import { Formulario } from "@/ui/formulario";
import { CampoRotulado, campo } from "@/features/movimento/ui";
import { salvarRegra } from "./acoes";
import { CLASSES, CLASSES_LISTA, type Classe, type Regra } from "./regras";

const BOTAO = "inline-flex min-h-10 items-center justify-center rounded-lg border border-linha px-5 text-sm font-medium whitespace-nowrap text-texto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco";
const PRIMARIO = "inline-flex min-h-10 items-center justify-center rounded-lg bg-[linear-gradient(135deg,#0e7490,#0f766e)] px-5 text-sm font-semibold whitespace-nowrap text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco dark:bg-none dark:bg-[#2dd4bf] dark:text-[#0b2e3a]";

// Abre a janela de uma regra: "Nova regra de prazo" e "Editar tabela" usam a mesma.
export function DialogoRegra({ rotulo, regras, primario = false }: { rotulo: string; regras: Regra[]; primario?: boolean }) {
  const janela = useRef<HTMLDialogElement>(null);
  const livre = CLASSES_LISTA.find((c) => !regras.some((r) => r.classe === c)) ?? CLASSES_LISTA[0];
  const [classe, setClasse] = useState<Classe>(livre);
  const atual = regras.find((r) => r.classe === classe);

  return (
    <>
      <button
        type="button"
        className={primario ? PRIMARIO : BOTAO}
        onClick={() => {
          setClasse(livre);
          janela.current?.showModal();
        }}
      >
        {rotulo}
      </button>
      <dialog ref={janela} aria-label="Regra de prazo" className="m-auto w-[min(92vw,420px)] rounded-xl border border-linha bg-superficie p-5 text-texto backdrop:bg-black/50">
        <Formulario acao={salvarRegra} botao="Salvar regra" enviando="Salvando…" className="gap-4">
          <h2 className="font-[family-name:var(--font-titulo)] text-base font-semibold">Regra de prazo</h2>
          <CampoRotulado rotulo="Tipo de documento">
            <select name="classe" value={classe} onChange={(e) => setClasse(e.target.value as Classe)} className={campo}>
              {CLASSES_LISTA.map((c) => (
                <option key={c} value={c}>
                  {CLASSES[c]}
                </option>
              ))}
            </select>
          </CampoRotulado>
          {/* key: ao trocar o tipo, os campos voltam aos valores da regra dele */}
          <div key={classe} className="grid grid-cols-2 gap-3">
            <CampoRotulado rotulo="Fase corrente (anos)">
              <input name="corrente" type="number" min={0} max={50} step={1} required defaultValue={atual?.corrente ?? ""} className={campo} />
            </CampoRotulado>
            <CampoRotulado rotulo="Intermediária (anos)">
              <input name="intermediaria" type="number" min={0} max={50} step={1} required defaultValue={atual?.intermediaria ?? ""} className={campo} />
            </CampoRotulado>
            <div className="col-span-2">
              <CampoRotulado rotulo="Destinação final">
                <select name="destinacao" defaultValue={atual?.destinacao ?? "eliminacao"} className={campo}>
                  <option value="eliminacao">Eliminação</option>
                  <option value="guarda_permanente">Guarda permanente</option>
                </select>
              </CampoRotulado>
            </div>
          </div>
        </Formulario>
        <button type="button" className={`${BOTAO} mt-3 w-full`} onClick={() => janela.current?.close()}>
          Fechar
        </button>
      </dialog>
    </>
  );
}
