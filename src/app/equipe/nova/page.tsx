import type { Metadata } from "next";
import Link from "next/link";
import { PaginaEquipe } from "@/features/equipe/pagina";
import { NovaPrefeitura } from "@/features/equipe/nova-prefeitura";
import { listarPedidos } from "@/features/equipe/dados";
import { exigirEquipe } from "@/features/sessao/dal";

export const metadata: Metadata = { title: "Nova prefeitura · LicCONT" };

export default async function NovaPrefeituraPagina({ searchParams }: { searchParams: Promise<{ pedido?: string }> }) {
  await exigirEquipe();
  const { pedido } = await searchParams;
  // Do pedido de demonstração vem só o nome do órgão; o resto a equipe confere.
  const orgao = pedido ? (await listarPedidos(200)).find((p) => p.id === pedido)?.orgao : undefined;
  return (
    <PaginaEquipe
      titulo="Nova prefeitura"
      trilha={
        <span>
          <Link href="/equipe" className="text-destaque hover:underline">Equipe LicCONT</Link>
          {" › "}
          <Link href="/equipe/prefeituras" className="text-destaque hover:underline">Prefeituras</Link>
          {" › Nova prefeitura"}
        </span>
      }
    >
      <NovaPrefeitura nomeInicial={orgao} />
    </PaginaEquipe>
  );
}
