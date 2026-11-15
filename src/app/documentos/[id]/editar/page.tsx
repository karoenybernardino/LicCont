import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { exigirSessao, nomePrefeitura } from "@/features/sessao/dal";
import { PaginaSistema } from "@/features/sessao/pagina";
import { limitePdfMb, obterDocumento, opcoesEstrutura, posicaoDaCaixa, secretariasParaCadastro } from "@/features/documentos/dados";
import { FormularioDocumento } from "@/features/documentos/formulario";
import { lerRegras } from "@/features/temporalidade/dados";
import { esquemaId } from "@/features/documentos/esquemas";
import { tituloDocumento } from "@/features/documentos/titulo";

export const metadata: Metadata = { title: "Editar documento · LicCONT" };

export default async function EditarDocumento({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!esquemaId.safeParse({ id }).success) notFound();
  const { usuario, secretaria } = await exigirSessao();
  const doc = await obterDocumento(id);
  if (!doc) notFound();
  const secretarias = await secretariasParaCadastro(usuario);
  if (!secretarias.some((s) => s.id === doc.secretariaId)) redirect(`/documentos/${id}`);
  const [estrutura, prefeitura, limiteMb, pos, regras] = await Promise.all([
    opcoesEstrutura(),
    nomePrefeitura(usuario),
    limitePdfMb(usuario),
    posicaoDaCaixa(doc.caixaId),
    lerRegras(),
  ]);
  return (
    <PaginaSistema usuario={usuario} secretaria={secretaria} titulo={tituloDocumento(doc)} trilha="Acervo · Editar">
      <FormularioDocumento
        secretarias={secretarias}
        secretariaPadrao={doc.secretariaId}
        estrutura={estrutura}
        prefeitura={prefeitura}
        limiteMb={limiteMb}
        regras={regras}
        inicial={{
          id: doc.id, tipo: doc.tipo, modalidade: doc.modalidade, numero: doc.numero, ano: doc.ano, objeto: doc.objeto,
          empresa: doc.empresa, cnpj: doc.cnpj, valor: doc.valor, situacao: doc.situacao,
          vigencia_inicio: doc.vigencia_inicio, vigencia_fim: doc.vigencia_fim, encerrado_em: doc.encerrado_em, secretariaId: doc.secretariaId,
          caixaId: doc.caixaId, ruaId: pos?.ruaId ?? "", moduloId: pos?.moduloId ?? "", nivelId: pos?.nivelId ?? "",
          arquivo: doc.arquivo?.nome ?? null,
        }}
      />
    </PaginaSistema>
  );
}
