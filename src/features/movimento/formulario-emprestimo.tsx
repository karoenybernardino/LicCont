"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { registrarEmprestimo } from "./acoes";
import { CampoRotulado, campo } from "./ui";
import type { DocumentoEmprestavel } from "./dados";

const BOTAO = "inline-flex min-h-10 items-center justify-center rounded-lg px-5 text-sm whitespace-nowrap focus-visible:outline-2 focus-visible:outline-foco disabled:cursor-not-allowed disabled:opacity-55";

const somar = (iso: string, dias: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + dias * 86_400_000).toISOString().slice(0, 10);

// Painel "Registrar empréstimo". O servidor confere tudo de novo.
export function FormularioEmprestimo({ documentos, hoje, setores }: { documentos: DocumentoEmprestavel[]; hoje: string; setores: string[] }) {
  const formulario = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [msg, setMsg] = useState<{ texto: string; tom: "erro" | "ok" } | null>(null);
  const [doc, setDoc] = useState("");
  const [retirada, setRetirada] = useState(hoje);
  const [prazo, setPrazo] = useState(somar(hoje, 15));
  const escolhido = documentos.find((d) => d.id === doc);

  function aoEscolher(id: string) {
    setDoc(id);
    const d = documentos.find((x) => x.id === id);
    if (d) setPrazo(somar(retirada, d.prazoDias));
  }
  function limpar() {
    formulario.current?.reset();
    setDoc("");
    setRetirada(hoje);
    setPrazo(somar(hoje, 15));
    setMsg(null);
  }
  function enviar(f: FormData) {
    iniciar(async () => {
      const r = await registrarEmprestimo(f);
      if (r.erro) setMsg({ texto: r.erro, tom: "erro" });
      else if (r.aviso && !r.ok) setMsg({ texto: r.aviso, tom: "ok" });
      else {
        limpar();
        setMsg({ texto: r.aviso ?? "Empréstimo registrado.", tom: "ok" });
        router.refresh();
      }
    });
  }

  return (
    <form ref={formulario} action={enviar} className="flex flex-col gap-3.5">
      <CampoRotulado rotulo="Documento">
        <select name="documento" required value={doc} onChange={(e) => aoEscolher(e.target.value)} className={campo}>
          <option value="">{documentos.length ? "Escolha o documento" : "Nenhum documento disponível"}</option>
          {documentos.map((d) => (
            <option key={d.id} value={d.id}>{d.titulo} · {d.caixa}</option>
          ))}
        </select>
      </CampoRotulado>
      {escolhido && <p className="-mt-1.5 font-mono text-xs text-texto-suave">{escolhido.caixa} · Disponível</p>}
      <CampoRotulado rotulo="Retirado por">
        <input name="nome" required maxLength={120} autoComplete="off" className={campo} />
      </CampoRotulado>
      <CampoRotulado rotulo="Setor">
        <input name="setor" required maxLength={120} autoComplete="off" list="setores" className={campo} />
        <datalist id="setores">
          {setores.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
      </CampoRotulado>
      <div className="grid grid-cols-2 gap-3">
        <CampoRotulado rotulo="Data da retirada">
          <input name="retirada" type="date" required max={hoje} value={retirada} onChange={(e) => setRetirada(e.target.value)} className={campo} />
        </CampoRotulado>
        <CampoRotulado rotulo="Prazo de devolução">
          <input name="prazo" type="date" required min={retirada} max={somar(retirada, 60)} value={prazo} onChange={(e) => setPrazo(e.target.value)} className={campo} />
        </CampoRotulado>
      </div>
      <CampoRotulado rotulo="Observação">
        <input name="observacao" maxLength={500} autoComplete="off" className={campo} />
      </CampoRotulado>
      <div className="mt-1 flex gap-2.5">
        <button
          type="submit"
          disabled={pendente || documentos.length === 0}
          className={`${BOTAO} flex-1 bg-[linear-gradient(135deg,#0e7490,#0f766e)] font-semibold text-white dark:bg-none dark:bg-[#2dd4bf] dark:text-[#0b2e3a]`}
        >
          Registrar empréstimo
        </button>
        <button type="button" onClick={limpar} className={`${BOTAO} border border-linha font-medium text-texto`}>
          Limpar
        </button>
      </div>
      {msg && (
        <p role={msg.tom === "erro" ? "alert" : "status"} className={`text-[13px] leading-5 ${msg.tom === "erro" ? "text-[#b42318] dark:text-[#ff8a80]" : "text-texto-suave"}`}>
          {msg.texto}
        </p>
      )}
    </form>
  );
}
