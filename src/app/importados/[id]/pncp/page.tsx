import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { botaoContorno } from "@/ui/canvas";
import { exigirSessao } from "@/features/sessao/dal";
import { PaginaSistema } from "@/features/sessao/pagina";
import { obterDocumento, secretariasParaCadastro } from "@/features/documentos/dados";
import { tituloDocumento } from "@/features/documentos/titulo";
import { BuscaPncp } from "@/features/pncp/busca";

export const metadata: Metadata = { title: "Buscar PDF no PNCP · LicCONT" };

export default async function PncpPagina({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { usuario, secretaria } = await exigirSessao();
  const doc = await obterDocumento(id);
  if (!doc) notFound();
  const permitidas = await secretariasParaCadastro(usuario);
  if (!permitidas.some((s) => s.id === doc.secretariaId)) redirect(`/documentos/${id}`);
  return (
    <PaginaSistema
      usuario={usuario}
      secretaria={secretaria}
      titulo="Buscar PDF no PNCP"
      trilha="Acervo · Importados do TCE · Buscar PDF no PNCP"
      acoes={
        <Link href={`/documentos/${id}`} className={botaoContorno}>
          Voltar ao documento
        </Link>
      }
    >
      <p className="mb-3 text-sm">
        <strong>{tituloDocumento(doc)}</strong> · {doc.objeto}
      </p>
      <BuscaPncp documento={id} cnpjInicial={doc.cnpj ?? ""} anoInicial={doc.ano} />
    </PaginaSistema>
  );
}
