import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Painel, TituloPainel } from "@/features/estrutura/componentes";
import { exigirSessao } from "@/features/sessao/dal";
import { PaginaSistema } from "@/features/sessao/pagina";
import { documentosSemPdf, secretariasParaCadastro } from "@/features/documentos/dados";
import { LoteEnvio } from "@/features/documentos/lote-envio";

export const metadata: Metadata = { title: "Enviar vários PDFs · LicCONT" };

// Anexa vários PDFs de uma vez a documentos já cadastrados e sem PDF.
export default async function EnviarVariosPdfs() {
  const { usuario, secretaria } = await exigirSessao();
  const secretarias = await secretariasParaCadastro(usuario);
  if (!secretarias.length) redirect("/pesquisa");
  const documentos = await documentosSemPdf(secretarias.map((s) => s.id));
  return (
    <PaginaSistema
      usuario={usuario}
      secretaria={secretaria}
      titulo="Enviar vários PDFs"
      trilha="Acervo · Digitalização em lote"
      acoes={
        <Link href="/documentos/novo" className="inline-flex min-h-10 items-center rounded-lg border border-linha px-5 text-sm font-medium text-texto">
          Cadastrar documento
        </Link>
      }
    >
      <Painel>
        <TituloPainel>PDFs para documentos sem digitalização</TituloPainel>
        <p className="text-sm text-texto-suave">
          O sistema sugere o documento pelo número e ano no nome do arquivo (ex.: contrato-019-2015.pdf). Confira cada linha antes de enviar.
          Cada PDF é conferido no servidor, como no cadastro.
        </p>
        <LoteEnvio documentos={documentos} />
      </Painel>
    </PaginaSistema>
  );
}
