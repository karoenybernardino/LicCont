import type { Metadata } from "next";
import { Painel, TituloPainel } from "@/features/estrutura/componentes";
import { exigirAdmin } from "@/features/sessao/dal";
import { PaginaSistema } from "@/features/sessao/pagina";
import { botaoPrimario } from "@/ui/canvas";

export const metadata: Metadata = { title: "Exportar dados · LicCONT" };

export default async function Exportar() {
  const { usuario, secretaria } = await exigirAdmin();
  return (
    <PaginaSistema usuario={usuario} secretaria={secretaria} titulo="Exportar todos os dados" trilha="Configurações · Exportação">
      <Painel>
        <TituloPainel>Pacote de devolução</TituloPainel>
        <p className="text-sm text-texto-suave">
          Um arquivo ZIP com planilhas (estrutura, documentos, empréstimos e auditoria), os PDFs originais e um arquivo de conferência com o código SHA-256 de cada PDF. O pacote leva até 150 MB de PDFs; o que passar disso é listado em <code>pdfs_nao_incluidos.csv</code>. A geração pode levar alguns minutos, e cada exportação fica registrada na auditoria (só contagens).
        </p>
        <div>
          <a href="/configuracoes/exportar/baixar" className={botaoPrimario}>
            Gerar e baixar o pacote
          </a>
        </div>
      </Painel>
    </PaginaSistema>
  );
}
