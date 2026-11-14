import type { Metadata } from "next";
import { Acoes, CartaoErro, LinkPrincipal } from "@/features/sessao/erro";
import { PaginaErro } from "@/features/sessao/pagina-erro";

export const metadata: Metadata = { title: "Página não encontrada · LicCONT" };

export default function NaoEncontrada() {
  return (
    <PaginaErro titulo="Página não encontrada">
      <CartaoErro
        icone="busca"
        codigo="ERRO 404"
        titulo="Página não encontrada"
        texto="O endereço pode ter mudado ou o documento foi removido."
      >
        <Acoes>
          <LinkPrincipal href="/inicio">Voltar ao início</LinkPrincipal>
        </Acoes>
      </CartaoErro>
    </PaginaErro>
  );
}
