import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirSessao } from "@/features/sessao/dal";
import { PaginaSistema } from "@/features/sessao/pagina";
import { obterDocumento } from "@/features/documentos/dados";
import { esquemaId } from "@/features/documentos/esquemas";
import { PainelDocumento } from "@/features/documentos/painel";
import { tituloDocumento } from "@/features/documentos/titulo";

export const metadata: Metadata = { title: "Documento · LicCONT" };

export default async function Documento({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!esquemaId.safeParse({ id }).success) notFound();
  const { usuario, secretaria } = await exigirSessao();
  const doc = await obterDocumento(id);
  if (!doc) notFound();
  return (
    <PaginaSistema
      usuario={usuario}
      secretaria={secretaria}
      titulo={tituloDocumento(doc)}
      trilha={<Link href="/pesquisa" className="text-destaque hover:underline">Pesquisa</Link>}
    >
      <div className="max-w-3xl">
        <PainelDocumento doc={doc} usuario={usuario} inteiro />
      </div>
    </PaginaSistema>
  );
}
