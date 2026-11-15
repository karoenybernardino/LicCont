import type { Metadata } from "next";
import Link from "next/link";
import { PaginaEquipe } from "@/features/equipe/pagina";
import { NovaPrefeitura } from "@/features/equipe/nova-prefeitura";
import { exigirEquipe } from "@/features/sessao/dal";

export const metadata: Metadata = { title: "Nova prefeitura · LicCONT" };

export default async function NovaPrefeituraPagina() {
  await exigirEquipe();
  return (
    <PaginaEquipe
      titulo="Nova prefeitura"
      trilha={
        <span>
          <Link href="/equipe" className="text-destaque hover:underline">Equipe LicCONT</Link>
          {" › "}
          <Link href="/equipe" className="text-destaque hover:underline">Prefeituras</Link>
          {" › Nova prefeitura"}
        </span>
      }
    >
      <NovaPrefeitura />
    </PaginaEquipe>
  );
}
