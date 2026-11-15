import type { Metadata } from "next";
import { PaginaLegal, Secao } from "@/features/site/texto-legal";

export const metadata: Metadata = { title: "Termo de uso · LicCONT" };

export default function Termos() {
  return (
    <PaginaLegal titulo="Termo de uso">
      <Secao titulo="Quem pode usar">
        <p>Servidores autorizados pela prefeitura ou Câmara contratante. O acesso é pessoal e não pode ser compartilhado.</p>
      </Secao>
      <Secao titulo="O que você se compromete a fazer">
        <p>
          Usar o sistema só para o trabalho do arquivo, manter a senha em segredo, não tentar ver dados de outra prefeitura ou secretaria e registrar no sistema o que de fato foi feito com o documento.
        </p>
      </Secao>
      <Secao titulo="Registro de ações">
        <p>Cada ação relevante fica na auditoria, com data, pessoa e IP. A auditoria não pode ser apagada.</p>
      </Secao>
      <Secao titulo="Dados da prefeitura">
        <p>
          Os dados do acervo pertencem à prefeitura. Ela pode pedir a exportação completa e a eliminação ao sair do sistema, nos prazos do contrato.
        </p>
      </Secao>
      <Secao titulo="Disponibilidade e suspensão">
        <p>
          A prefeitura pode ter o acesso suspenso por falta de pagamento ou uso indevido. Os dados são mantidos e podem ser exportados enquanto durar a suspensão.
        </p>
      </Secao>
    </PaginaLegal>
  );
}
