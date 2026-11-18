"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { BotaoEnviar } from "@/ui/botao-enviar";
import { formatarCnpj } from "@/features/prefeituras/lista";
import { logoParaPng } from "./logo";
import { salvarMarcaOrgao, salvarParceira } from "./marca-acoes";
import type { MarcaOrgao, OrgaoDaParceira, Parceira } from "./marca";

const campo = "min-h-10 w-full rounded-lg border border-borda-campo bg-campo px-3 text-sm text-texto focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-foco";
const rotulo = "text-[11px] font-medium tracking-[.05em] text-texto-suave uppercase";
const contorno = "inline-flex min-h-10 items-center justify-center rounded-lg border border-linha px-4 text-sm font-medium hover:border-destaque focus-visible:outline-2 focus-visible:outline-foco";
const primario = "inline-flex min-h-10 items-center justify-center rounded-lg bg-[linear-gradient(135deg,#0e7490,#0f766e)] px-5 text-sm font-semibold text-white hover:opacity-90 focus-visible:outline-2 focus-visible:outline-foco disabled:opacity-60 dark:bg-none dark:bg-[#2dd4bf] dark:text-[#0b2e3a]";

// Escolhe PNG ou SVG, converte para PNG no navegador e deixa o arquivo pronto no campo "logo" do formulário.
function LogoUpload({ atual, texto }: { atual: string | null; texto: string }) {
  const oculto = useRef<HTMLInputElement>(null);
  const [previa, setPrevia] = useState<string | null>(atual);
  const [erro, setErro] = useState<string | null>(null);
  async function escolher(f: File | undefined) {
    if (!f) return;
    setErro(null);
    try {
      const png = await logoParaPng(f);
      const arquivo = new File([png], "logo.png", { type: "image/png" });
      const lista = new DataTransfer();
      lista.items.add(arquivo);
      if (oculto.current) oculto.current.files = lista.files;
      setPrevia((anterior) => {
        if (anterior?.startsWith("blob:")) URL.revokeObjectURL(anterior);
        return URL.createObjectURL(png);
      });
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível ler a imagem.");
    }
  }
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-xl border border-dashed border-linha p-3.5">
      <span className="flex h-[56px] w-[106px] shrink-0 items-center justify-center overflow-hidden rounded-lg border border-linha bg-white text-[10px] font-bold tracking-wider text-[#3f5e66]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {previa ? <img src={previa} alt="Logo atual" className="max-h-full max-w-full object-contain" /> : "LOGO"}
      </span>
      <div className="min-w-0 flex-1 text-[13px]">
        <b className="block">{texto}</b>
        <span className="text-texto-suave">PNG ou SVG, até 1 MB, de preferência com fundo transparente.</span>
        {erro && <span role="alert" className="mt-1 block font-medium text-[#b91c1c] dark:text-[#fca5a5]">{erro}</span>}
      </div>
      <label className={`${contorno} cursor-pointer`}>
        {previa ? "Trocar" : "Enviar logo"}
        <input type="file" accept=".png,.svg,image/png,image/svg+xml" className="sr-only" onChange={(e) => escolher(e.target.files?.[0])} />
      </label>
      <input ref={oculto} type="file" name="logo" className="hidden" tabIndex={-1} aria-hidden />
    </div>
  );
}

export function FormMarca({ id, marca, parceiras }: { id: string; marca: MarcaOrgao; parceiras: Parceira[] }) {
  return (
    <form action={salvarMarcaOrgao} className="flex flex-col gap-3.5">
      <input type="hidden" name="id" value={id} />
      <LogoUpload atual={marca.logoUrl} texto="Logo do órgão" />
      {marca.logoUrl && (
        <label className="flex items-center gap-2 text-[13px]">
          <input type="checkbox" name="remover_logo" className="size-4 accent-[#0e7490]" /> Remover o logo atual (se não enviar outro)
        </label>
      )}
      <label className="flex flex-col gap-[5px]">
        <span className={rotulo}>Tipo de órgão</span>
        <select name="tipo" defaultValue={marca.tipo} className={campo}>
          <option value="prefeitura">Prefeitura</option>
          <option value="camara">Câmara</option>
        </select>
      </label>
      <label className="flex flex-col gap-[5px]">
        <span className={rotulo}>Nome na etiqueta (quando não há logo)</span>
        <input name="nome_etiqueta" maxLength={120} defaultValue={marca.nomeEtiqueta} className={campo} />
      </label>
      <label className="flex flex-col gap-[5px]">
        <span className={rotulo}>Empresa parceira</span>
        <select name="parceira" defaultValue={marca.parceiraId ?? ""} className={campo}>
          <option value="">Sem empresa parceira</option>
          {parceiras.filter((p) => p.ativa || p.id === marca.parceiraId).map((p) => (
            <option key={p.id} value={p.id}>{p.nome}</option>
          ))}
        </select>
      </label>
      <p className="text-[12.5px] text-texto-suave">Uma empresa parceira por órgão. O logo dela sai no rodapé, ao lado do LicCONT. Cadastro em Equipe LicCONT › Empresas parceiras.</p>
      <BotaoEnviar className={primario}>Salvar marca</BotaoEnviar>
    </form>
  );
}

export function FormParceira({ parceira, orgaos }: { parceira: Parceira | null; orgaos: OrgaoDaParceira[] }) {
  return (
    <form action={salvarParceira} className="flex flex-col gap-3.5" key={parceira?.id ?? "nova"}>
      <input type="hidden" name="id" value={parceira?.id ?? ""} />
      <div className="grid gap-3.5 sm:grid-cols-[1fr_.7fr]">
        <label className="flex flex-col gap-[5px]">
          <span className={rotulo}>Nome da empresa</span>
          <input name="nome" required minLength={2} maxLength={120} defaultValue={parceira?.nome ?? ""} className={campo} />
        </label>
        <label className="flex flex-col gap-[5px]">
          <span className={rotulo}>CNPJ</span>
          <input name="cnpj" required inputMode="numeric" defaultValue={parceira ? formatarCnpj(parceira.cnpj) : ""} placeholder="00.000.000/0001-00" className={`${campo} font-mono`} />
        </label>
      </div>
      <LogoUpload atual={parceira?.logoUrl ?? null} texto="Logo da empresa" />
      <fieldset className="flex flex-col gap-2">
        <legend className={`${rotulo} mb-1`}>Órgãos que usam esta empresa</legend>
        {orgaos.map((o) => (
          <label key={o.id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-linha px-3 py-2 has-[:checked]:bg-[rgba(45,212,191,.16)]">
            <input type="checkbox" name="orgaos" value={o.id} defaultChecked={o.ligada} className="size-4 accent-[#0e7490]" />
            <span className="text-sm">
              <b className="block font-semibold">{o.nome}</b>
              <span className="font-mono text-xs text-texto-suave">{o.cnpj}{o.deOutra ? " · hoje usa outra empresa (passa para esta ao salvar)" : ""}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <p className="text-[12.5px] text-texto-suave">Cada órgão usa uma empresa por vez. Órgão sem empresa ligada sai sem logo de parceira.</p>
      <div className="flex justify-end gap-2.5">
        <Link href="/equipe/prefeituras/parceiras" className={contorno}>Cancelar</Link>
        <BotaoEnviar className={primario}>Salvar</BotaoEnviar>
      </div>
    </form>
  );
}
