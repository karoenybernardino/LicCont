import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirSessao } from "@/features/sessao/dal";
import { PaginaSistema } from "@/features/sessao/pagina";
import { obterDocumento } from "@/features/documentos/dados";
import { esquemaId } from "@/features/documentos/esquemas";
import { tituloDocumento } from "@/features/documentos/titulo";
import { tomSituacao } from "@/features/documentos/painel";
import { formatarTamanho, formatarValor } from "@/features/documentos/formato";
import { SITUACOES } from "@/features/documentos/tipos";
import { VisualizadorPdf } from "@/features/documentos/visualizador";

export const metadata: Metadata = { title: "Visualizar documento · LicCONT" };

export default async function Visualizar({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!esquemaId.safeParse({ id }).success) notFound();
  const { usuario, secretaria } = await exigirSessao();
  const doc = await obterDocumento(id);
  if (!doc || doc.arquivo?.situacao !== "pronto") notFound();
  return (
    <PaginaSistema
      usuario={usuario}
      secretaria={secretaria}
      titulo="Visualizar documento"
      trilha={
        <span>
          <Link href="/pesquisa" className="text-destaque hover:underline">Pesquisa</Link>
          {" › "}
          <Link href={`/documentos/${id}`} className="text-destaque hover:underline">{tituloDocumento(doc)}</Link>
          {" › PDF"}
        </span>
      }
    >
      <VisualizadorPdf
        documentoId={id}
        voltar={`/documentos/${id}`}
        info={{
          titulo: tituloDocumento(doc),
          arquivo: [doc.arquivo.nome, doc.arquivo.paginas ? `${doc.arquivo.paginas} páginas` : null].filter(Boolean).join(" · "),
          tamanho: formatarTamanho(doc.arquivo.tamanho),
          campos: [
            { rotulo: "Empresa", valor: doc.empresa ?? "—" },
            { rotulo: "Secretaria", valor: doc.secretaria || "—" },
            { rotulo: "Ano", valor: String(doc.ano) },
            { rotulo: "Valor", valor: formatarValor(doc.valor) },
          ],
          situacao: { texto: SITUACOES[doc.situacao] ?? doc.situacao, tom: tomSituacao(doc.situacao) },
          posicao: doc.posicao?.texto ?? null,
          verNoMapa: doc.posicao ? `/mapa?caixa=${doc.caixaId}` : null,
        }}
      />
    </PaginaSistema>
  );
}
