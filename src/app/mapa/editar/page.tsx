import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { exigirSessao } from "@/features/sessao/dal";
import { PaginaSistema } from "@/features/sessao/pagina";
import { carregarEstrutura, podeCaixas } from "@/features/estrutura/dados";
import { plantaDoGalpao } from "@/features/mapa/dados";
import { EditorPlanta } from "@/features/mapa/editor";
import { estilos } from "@/features/mapa/painel-caixa";
import { lerParametros } from "@/features/mapa/url";

export const metadata: Metadata = { title: "Editar planta · LicCONT" };

export default async function EditarPlanta({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { usuario, secretaria } = await exigirSessao();
  // Operador e Consulta não abrem o editor (a ação também recusa no servidor).
  if (!(await podeCaixas(usuario))) redirect("/mapa");
  const p = lerParametros(await searchParams);
  const estrutura = await carregarEstrutura(p.galpao ?? undefined);
  if (!estrutura.galpao) redirect("/mapa");
  const planta = await plantaDoGalpao(estrutura.galpao.id);

  return (
    <PaginaSistema
      usuario={usuario}
      secretaria={secretaria}
      titulo="Editar planta"
      trilha="Mapa do galpão › Editar planta"
      acoes={<Link href={`/mapa?galpao=${estrutura.galpao.id}`} className={estilos.botaoBorda}>Voltar ao mapa</Link>}
    >
      <EditorPlanta estrutura={estrutura} planta={planta} galpaoId={estrutura.galpao.id} nomeGalpao={estrutura.galpao.nome} />
    </PaginaSistema>
  );
}
