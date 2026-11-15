"use client";

import { Campo } from "@/ui/campo";
import { Formulario } from "@/ui/formulario";
import { pedirDemonstracao } from "./acoes";

export function FormularioPedido() {
  return (
    <Formulario acao={pedirDemonstracao} botao="Enviar pedido" enviando="Enviando…" className="relative rounded-2xl border border-linha bg-superficie p-6">
      <h3 className="font-titulo text-xl font-bold">Pedir demonstração</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Nome" name="nome" placeholder="Seu nome" required maxLength={120} autoComplete="name" />
        <Campo rotulo="Cargo" name="cargo" placeholder="Ex.: secretário" maxLength={120} />
      </div>
      <Campo rotulo="Órgão" name="orgao" placeholder="Prefeitura ou Câmara Municipal" required maxLength={160} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="E-mail" name="email" type="email" placeholder="nome@prefeitura.gov.br" required maxLength={200} autoComplete="email" />
        <Campo rotulo="Telefone" name="telefone" type="tel" placeholder="(00) 00000-0000" maxLength={30} autoComplete="tel" />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="mensagem" className="text-xs font-medium uppercase tracking-[0.04em] text-texto-suave">
          Mensagem (opcional)
        </label>
        <textarea
          id="mensagem"
          name="mensagem"
          rows={3}
          maxLength={1000}
          placeholder="Quantas secretarias, tamanho do acervo, prazos"
          className="rounded-lg border border-borda-campo bg-campo px-3.5 py-3 text-[15px] text-texto focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-foco"
        />
      </div>
      {/* Campo-isca: invisível para quem usa o site. */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Não preencha
          <input name="empresa_site" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <p className="text-xs text-texto-suave">
        Usamos seus dados só para responder a este pedido. Veja a{" "}
        <a href="/privacidade" className="underline">
          política de privacidade
        </a>
        .
      </p>
    </Formulario>
  );
}
