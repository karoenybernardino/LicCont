import type { Metadata } from "next";
import { PaginaLegal, Secao } from "@/features/site/texto-legal";

export const metadata: Metadata = { title: "Política de privacidade · LicCONT" };

export default function Privacidade() {
  return (
    <PaginaLegal titulo="Política de privacidade">
      <Secao titulo="Quem somos">
        <p>
          O LicCONT é um sistema de arquivo de licitações e contratos. Para os dados do acervo, a prefeitura (ou Câmara) é a controladora e o LicCONT é o operador. Para os pedidos de demonstração feitos neste site, o LicCONT é o controlador.
        </p>
      </Secao>
      <Secao titulo="Dados do pedido de demonstração">
        <p>
          Nome, cargo, órgão, e-mail, telefone e a mensagem que você escrever. Usamos só para responder ao pedido. Guardamos só pelo tempo necessário para responder (prazo exato a definir com o advogado). Você pode pedir a correção ou a exclusão a qualquer momento pelos contatos do site.
        </p>
      </Secao>
      <Secao titulo="Dados do sistema">
        <p>
          Servidores da prefeitura têm conta (nome, e-mail e vínculo com secretarias). O acervo (documentos e PDFs) é separado por prefeitura e por secretaria. A equipe do LicCONT vê apenas números de uso, nunca o conteúdo dos documentos, e só entra em uma conta com autorização da prefeitura, por prazo curto e registrada.
        </p>
      </Secao>
      <Secao titulo="Auditoria">
        <p>Entradas, buscas, empréstimos e exportações ficam registrados com data, pessoa e IP, para prestação de contas.</p>
      </Secao>
      <Secao titulo="Onde ficam os dados e com quem são tratados">
        <p>
          O banco, os arquivos e o site rodam em serviços de nuvem contratados (ver lista de suboperadores com a prefeitura). Detalhes da localização dos dados serão informados no contrato.
        </p>
      </Secao>
      <Secao titulo="Seus direitos">
        <p>
          Confirmação de tratamento, acesso, correção, eliminação e informação sobre compartilhamento (LGPD, art. 18). Para dados do acervo, fale com o encarregado da sua prefeitura.
        </p>
      </Secao>
    </PaginaLegal>
  );
}
