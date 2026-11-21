import type { Metadata } from "next";
import { EquipeParceira } from "@/features/parceira/equipe";
import { PaginaParceira } from "@/features/parceira/pagina";
import { exigirDono, pessoasDaEmpresa, prefeiturasDaEmpresa } from "@/features/parceira/dados";

export const metadata: Metadata = { title: "Equipe · Empresa parceira · LicCONT" };

// Quadro PartEquipe: só o dono (exigirDono confere no servidor; o banco confere de novo).
export default async function EquipeDaParceira({ searchParams }: { searchParams: Promise<{ editar?: string; convidar?: string }> }) {
  const eu = await exigirDono();
  const q = await searchParams;
  const [pessoas, prefeituras] = await Promise.all([pessoasDaEmpresa(), prefeiturasDaEmpresa()]);
  return (
    <PaginaParceira eu={eu} titulo="Equipe">
      <EquipeParceira
        pessoas={pessoas}
        prefeituras={prefeituras.map((p) => ({ id: p.id, nome: p.nome }))}
        base="/parceira/equipe"
        editar={q.editar}
        convidar={q.convidar === "1"}
        parceiraId={eu.parceiraId}
        porEquipe={false}
      />
    </PaginaParceira>
  );
}
