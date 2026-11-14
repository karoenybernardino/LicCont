import { Acoes, CartaoErro, LinkPrincipal, LinkSecundario } from "./erro";
import { PaginaErro } from "./pagina-erro";

// Tela 403 do canvas. Ainda não usada: hoje a falta de permissão redireciona para
// /inicio (comportamento coberto pelos testes). Usar onde um documento de outra
// secretaria for pedido por endereço.
export function SemPermissao() {
  return (
    <PaginaErro titulo="Acesso restrito">
      <CartaoErro
        icone="cadeado"
        codigo="ERRO 403"
        titulo="Você não tem acesso a esta área"
        texto="Seu usuário não está vinculado à secretaria deste conteúdo. Peça acesso ao administrador da prefeitura."
      >
        <p className="text-xs text-texto-suave">A tentativa ficou registrada na auditoria.</p>
        <Acoes>
          <LinkPrincipal href="/inicio">Voltar ao início</LinkPrincipal>
          <LinkSecundario href="/entrar">Trocar de secretaria</LinkSecundario>
        </Acoes>
      </CartaoErro>
    </PaginaErro>
  );
}
