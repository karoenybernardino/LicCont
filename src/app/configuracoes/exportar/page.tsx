import type { Metadata } from "next";
import { Painel, TituloPainel } from "@/features/estrutura/componentes";
import { FormularioExportar } from "@/features/exportacao/formulario-exportar";
import { exigirAdmin } from "@/features/sessao/dal";
import { PaginaSistema } from "@/features/sessao/pagina";

export const metadata: Metadata = { title: "Exportar dados · LicCONT" };
// A geração roda numa Server Action desta página.
export const maxDuration = 300;

export default async function Exportar() {
  const { usuario, secretaria } = await exigirAdmin();
  return (
    <PaginaSistema usuario={usuario} secretaria={secretaria} titulo="Exportar todos os dados" trilha="Configurações · Exportação">
      <Painel>
        <TituloPainel>Pacote de devolução</TituloPainel>
        <p className="text-sm text-texto-suave">
          Arquivos ZIP com planilhas (estrutura, documentos, empréstimos e auditoria), os PDFs originais e um arquivo de conferência com o código SHA-256 de cada PDF. O pacote sai em volumes de até 40 MB (planilhas num, PDFs nos outros) e leva até 150 MB de PDFs; o que passar disso é listado em <code>pdfs_nao_incluidos.csv</code>, e planilha cortada por excesso de linhas é avisada no <code>LEIA-ME.txt</code>. A geração pode levar alguns minutos, os links de download valem 5 minutos e cada exportação fica registrada na auditoria (só contagens).
        </p>
        <FormularioExportar />
      </Painel>
    </PaginaSistema>
  );
}
