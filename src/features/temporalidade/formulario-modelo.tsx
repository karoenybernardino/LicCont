"use client";

import { Formulario } from "@/ui/formulario";
import { CAMPO_PREFEITURA } from "@/features/parceira/escolha";
import { salvarModelo } from "./acoes";
import { CAMPO, LINHA, ROTULO, TXT } from "./ui";

const campo = `w-full rounded-lg border ${LINHA} ${CAMPO} px-3 py-2 text-sm outline-0 focus-visible:outline-2 focus-visible:outline-[#0e7490] dark:focus-visible:outline-[#2dd4bf] ${TXT}`;

export function FormularioModelo({ tipo, baseLegal, assinaturas, prefeituraId }: { tipo: "eliminacao" | "emprestimo"; baseLegal: string; assinaturas: string; prefeituraId: string }) {
  return (
    <Formulario acao={salvarModelo} botao="Salvar modelo" enviando="Salvando…" className="mt-4 max-w-[720px]">
      <input type="hidden" name="tipo" value={tipo} />
      <input type="hidden" name={CAMPO_PREFEITURA} value={prefeituraId} />
      <label className="flex flex-col gap-1.5">
        <span className={ROTULO}>Texto-base (fundamento legal)</span>
        <textarea name="baseLegal" defaultValue={baseLegal} required maxLength={1500} rows={5} className={campo} />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className={ROTULO}>Linhas de assinatura (uma por linha, no máximo 6)</span>
        <textarea name="assinaturas" defaultValue={assinaturas} required maxLength={600} rows={4} className={campo} />
      </label>
    </Formulario>
  );
}
