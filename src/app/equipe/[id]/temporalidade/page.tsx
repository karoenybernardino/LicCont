import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Painel, TituloPainel } from "@/features/estrutura/componentes";
import { PaginaEquipe } from "@/features/equipe/pagina";
import { classesDoOrgao } from "@/features/equipe/marca";
import { idSchema } from "@/features/login/esquemas";
import { obterPrefeitura } from "@/features/prefeituras/dados";
import { exigirEquipe } from "@/features/sessao/dal";
import { EditorClasses } from "@/features/temporalidade/classes";

export const metadata: Metadata = { title: "Tabela de temporalidade · LicCONT" };

// A equipe LicCONT também edita a tabela de temporalidade de um órgão (decisão do dono).
// O banco confere de novo: classes_salvar exige a equipe ou o administrador do órgão.
export default async function TemporalidadeDoOrgao({ params }: PageProps<"/equipe/[id]/temporalidade">) {
  await exigirEquipe();
  const id = idSchema.safeParse((await params).id);
  if (!id.success) notFound();
  const p = await obterPrefeitura(id.data);
  if (!p) notFound();
  const { classes, grupos } = await classesDoOrgao(id.data);
  return (
    <PaginaEquipe
      titulo="Tabela de temporalidade"
      trilha={
        <span>
          <Link href="/equipe/prefeituras" className="text-destaque hover:underline">Prefeituras</Link>
          {" › "}
          <Link href={`/equipe/${id.data}?aba=marca`} className="text-destaque hover:underline">{p.nome}</Link>
        </span>
      }
    >
      <Painel>
        <TituloPainel>Tabela de temporalidade</TituloPainel>
        <p className="text-[12.5px] text-texto-suave">Código de classificação e prazo de guarda que saem nas etiquetas.</p>
        <EditorClasses prefeitura={id.data} classes={classes} grupos={grupos} />
      </Painel>
    </PaginaEquipe>
  );
}
