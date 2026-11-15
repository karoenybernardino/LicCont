"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Girando } from "@/ui/carregando";
import { salvarRegra } from "./acoes";
import { CLASSES, CLASSES_LISTA, type Classe, type Destinacao, type Regra } from "./regras";
import { AVISO_AMBAR, AVISO_AZUL, BLOCO, BOTAO_CONTORNO, BOTAO_PRIMARIO, CAMPO, LINHA, ROTULO, SELECAO, SUAVE, TXT } from "./ui";

const campoBase = `min-h-10 w-full rounded-lg border ${LINHA} ${CAMPO} px-3 text-sm outline-0 focus-visible:outline-2 focus-visible:outline-[#0e7490] dark:focus-visible:outline-[#2dd4bf] ${TXT}`;
const passo = `flex h-7 w-[26px] items-center justify-center rounded-md border ${LINHA} text-[15px] ${SUAVE} hover:border-[#0e7490] dark:hover:border-[#2dd4bf]`;

function Anos({ nome, valor, aoMudar }: { nome: string; valor: number; aoMudar: (n: number) => void }) {
  const ajustar = (d: number) => aoMudar(Math.min(50, Math.max(0, valor + d)));
  return (
    <span className={`flex min-h-10 w-full items-center gap-2 rounded-lg border ${LINHA} ${CAMPO} py-0 pr-1.5 pl-3 text-sm ${TXT}`}>
      <input
        name={nome}
        type="number"
        min={0}
        max={50}
        step={1}
        required
        value={valor}
        onChange={(e) => aoMudar(Number(e.target.value))}
        aria-label={nome === "corrente" ? "Fase corrente, em anos" : "Fase intermediária, em anos"}
        className="w-9 [appearance:textfield] bg-transparent font-mono text-[15px] font-medium outline-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <span className={`flex-1 text-[13px] ${SUAVE}`}>{valor === 1 ? "ano" : "anos"}</span>
      <button type="button" aria-label="Diminuir um ano" className={passo} onClick={() => ajustar(-1)}>
        −
      </button>
      <button type="button" aria-label="Aumentar um ano" className={passo} onClick={() => ajustar(1)}>
        +
      </button>
    </span>
  );
}

function Opcao({ valor, atual, titulo, texto, aoEscolher }: { valor: Destinacao; atual: Destinacao; titulo: string; texto: string; aoEscolher: (d: Destinacao) => void }) {
  const marcada = valor === atual;
  return (
    <label
      className={`flex cursor-pointer items-start gap-2.5 rounded-[10px] border px-3 py-2.5 ${TXT} has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[#0e7490] dark:has-[:focus-visible]:outline-[#2dd4bf] ${
        marcada ? `border-[#0e7490] dark:border-[#2dd4bf] ${SELECAO}` : `${LINHA} bg-transparent hover:border-[#0e7490] dark:hover:border-[#2dd4bf]`
      }`}
    >
      <input type="radio" name="destinacao" value={valor} checked={marcada} onChange={() => aoEscolher(valor)} className="sr-only" />
      <span
        aria-hidden
        className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border-[1.5px] ${marcada ? "border-[#0e7490] dark:border-[#2dd4bf]" : LINHA}`}
      >
        {marcada && <span className="size-2 rounded-full bg-[#0e7490] dark:bg-[#2dd4bf]" />}
      </span>
      <span>
        <span className="block text-sm font-semibold">{titulo}</span>
        <span className={`text-xs leading-4 ${SUAVE}`}>{texto}</span>
      </span>
    </label>
  );
}

// Janela da regra de prazo (quadro TemporalidadeRegra*). "Nova regra de prazo" e
// "Editar tabela" abrem a mesma janela; a regra existente do tipo preenche os campos.
export function DialogoRegra({ rotulo, regras, primario = false }: { rotulo: string; regras: Regra[]; primario?: boolean }) {
  const janela = useRef<HTMLDialogElement>(null);
  const livre = CLASSES_LISTA.find((c) => !regras.some((r) => r.classe === c)) ?? CLASSES_LISTA[0];
  const [classe, setClasse] = useState<Classe>(livre);
  const atual = regras.find((r) => r.classe === classe);
  const [corrente, setCorrente] = useState(atual?.corrente ?? 2);
  const [intermediaria, setIntermediaria] = useState(atual?.intermediaria ?? 5);
  const [destinacao, setDestinacao] = useState<Destinacao>(atual?.destinacao ?? "eliminacao");
  const [estado, enviar, pendente] = useActionState(salvarRegra, undefined);

  const escolher = (c: Classe) => {
    const r = regras.find((x) => x.classe === c);
    setClasse(c);
    setCorrente(r?.corrente ?? 2);
    setIntermediaria(r?.intermediaria ?? 5);
    setDestinacao(r?.destinacao ?? "eliminacao");
  };
  useEffect(() => {
    if (estado?.aviso === "Regra salva.") janela.current?.close();
  }, [estado]);

  const total = corrente + intermediaria;
  const permanente = destinacao === "guarda_permanente";

  return (
    <>
      <button
        type="button"
        className={primario ? BOTAO_PRIMARIO : BOTAO_CONTORNO}
        onClick={() => {
          escolher(livre);
          janela.current?.showModal();
        }}
      >
        {rotulo}
      </button>
      <dialog
        ref={janela}
        aria-label="Regra de prazo"
        className={`m-auto w-[530px] max-w-[92vw] flex-col gap-4 rounded-2xl border bg-[rgba(255,255,255,.78)] px-6 py-[22px] shadow-[0_30px_80px_rgba(0,0,0,.45)] backdrop:bg-[rgba(11,46,58,.38)] backdrop:backdrop-blur-[2px] open:flex dark:bg-[#0d1a1f] dark:backdrop:bg-[rgba(0,0,0,.62)] ${LINHA} ${TXT}`}
      >
        <form action={enviar} className="contents">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className={`text-xs ${SUAVE}`}>Tabela de temporalidade</div>
              <h2 className="mt-0.5 font-[family-name:var(--font-titulo)] text-[19px] font-bold">Editar regra de prazo</h2>
            </div>
            <button
              type="button"
              aria-label="Fechar"
              onClick={() => janela.current?.close()}
              className={`flex size-[34px] items-center justify-center rounded-[9px] border ${LINHA} hover:border-[#0e7490] dark:hover:border-[#2dd4bf]`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>

          <label className="flex min-w-0 flex-col gap-[5px]">
            <span className={ROTULO}>Tipo de documento</span>
            <select name="classe" value={classe} onChange={(e) => escolher(e.target.value as Classe)} className={campoBase}>
              {CLASSES_LISTA.map((c) => (
                <option key={c} value={c}>
                  {CLASSES[c]}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex min-w-0 flex-col gap-[5px]">
              <span className={ROTULO}>Fase corrente</span>
              <Anos nome="corrente" valor={corrente} aoMudar={setCorrente} />
            </label>
            <label className="flex min-w-0 flex-col gap-[5px]">
              <span className={ROTULO}>Intermediária</span>
              <Anos nome="intermediaria" valor={intermediaria} aoMudar={setIntermediaria} />
            </label>
          </div>

          <fieldset className="flex flex-col gap-[5px]">
            <legend className={`mb-[5px] ${ROTULO}`}>Destinação final</legend>
            <div className="grid grid-cols-2 gap-2">
              <Opcao valor="eliminacao" atual={destinacao} titulo="Eliminação" texto="vai para a fila quando vencer" aoEscolher={setDestinacao} />
              <Opcao valor="guarda_permanente" atual={destinacao} titulo="Guarda permanente" texto="nunca pode ser descartado" aoEscolher={setDestinacao} />
            </div>
          </fieldset>

          <div className={`flex flex-col gap-2 rounded-[10px] border px-3.5 py-3 ${LINHA} ${BLOCO}`}>
            <span className={ROTULO}>Como fica o prazo</span>
            <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-[5px]" aria-hidden>
              <span style={{ flex: corrente }} className="bg-[#0e7490] dark:bg-[#2dd4bf]" />
              <span style={{ flex: intermediaria }} className="bg-[#7cc4cf] dark:bg-[#4f8592]" />
              {!permanente && <span className="w-3.5 bg-[#ef4444]" />}
            </div>
            <div className={`flex text-xs ${SUAVE}`}>
              <span style={{ flex: Math.max(corrente, 1) }}>Corrente · {corrente} {corrente === 1 ? "ano" : "anos"}</span>
              <span style={{ flex: Math.max(intermediaria, 1) }}>Intermediária · {intermediaria} {intermediaria === 1 ? "ano" : "anos"}</span>
              {!permanente && <span>Eliminação</span>}
            </div>
            <div className="text-[13px] leading-[19px]">
              {permanente ? (
                <>
                  Depois dos {total} anos o documento <b>continua guardado</b>: nunca entra na fila de eliminação.
                </>
              ) : (
                <>
                  Encerrado em <b className="font-mono font-medium">03/2023</b> → pronto para eliminação em <b className="font-mono font-medium">{`03/${2023 + total}`}</b>.
                </>
              )}
            </div>
          </div>

          {permanente ? (
            <div className={`flex items-start gap-2.5 rounded-[10px] border px-3 py-2.5 ${AVISO_AMBAR}`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="mt-px shrink-0 stroke-[#b45309] dark:stroke-[#fbbf24]">
                <path d="M12 9v4M12 17h.01" />
                <path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
              </svg>
              <span className="text-[12.5px] leading-[18px]">
                Passar uma regra de <b>guarda permanente</b> para eliminação é decisão do administrador e fica registrada na auditoria. Termos já aprovados nunca mudam.
              </span>
            </div>
          ) : (
            <div className={`flex items-start gap-2.5 rounded-[10px] border px-3 py-2.5 ${AVISO_AZUL}`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="mt-px shrink-0 stroke-[#0e7490] dark:stroke-[#2dd4bf]">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 11v5M12 8h.01" />
              </svg>
              <span className="text-[12.5px] leading-[18px]">
                A contagem começa no <b>encerramento do processo</b> (licitação) ou no <b>fim da vigência</b> (contrato). Mudar o prazo não altera termos já aprovados e fica registrado na auditoria.
              </span>
            </div>
          )}

          {estado?.erro && (
            <p role="alert" className="text-sm text-erro">
              {estado.erro}
            </p>
          )}
          {estado?.aviso && estado.aviso !== "Regra salva." && (
            <p role="status" className="text-sm">
              {estado.aviso}
            </p>
          )}

          <div className={`mt-0.5 flex justify-end gap-2.5 border-t pt-4 ${LINHA}`}>
            <button type="button" className={BOTAO_CONTORNO} onClick={() => janela.current?.close()}>
              Cancelar
            </button>
            <button type="submit" className={BOTAO_PRIMARIO} disabled={pendente}>
              {pendente ? (
                <span className="inline-flex items-center gap-2">
                  <Girando />
                  Salvando…
                </span>
              ) : (
                "Salvar regra"
              )}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
