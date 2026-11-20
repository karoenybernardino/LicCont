import type { Metadata } from "next";
import { Acoes, CartaoErro, LinkPrincipal, LinkSecundario } from "@/features/sessao/erro";
import { PaginaErro } from "@/features/sessao/pagina-erro";

export const metadata: Metadata = { title: "Página não encontrada · LicCONT" };

export default function NaoEncontrada() {
  return (
    <PaginaErro titulo="Página não encontrada">
      <CartaoErro
        icone="busca"
        codigo="ERRO 404"
        titulo="Página não encontrada"
        texto="O endereço pode ter mudado ou o documento foi removido. Use a pesquisa para encontrá-lo pelo número, título ou ano."
      >
        <form action="/pesquisa" role="search" className="mt-1.5 flex h-11 w-full items-center gap-2.5 rounded-[10px] border border-linha bg-campo px-3.5 focus-within:outline-2 focus-within:outline-foco">
          <svg aria-hidden width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-texto-suave">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-4-4" />
          </svg>
          <input name="q" maxLength={100} aria-label="Buscar documento" placeholder="Número do processo, título ou objeto" className="min-w-0 flex-1 bg-transparent text-sm outline-0 placeholder:text-texto-suave" />
          <button type="submit" hidden>Buscar</button>
        </form>
        <Acoes>
          <LinkPrincipal href="/pesquisa">Ir para a pesquisa</LinkPrincipal>
          <LinkSecundario href="/inicio">Voltar ao início</LinkSecundario>
        </Acoes>
      </CartaoErro>
    </PaginaErro>
  );
}
