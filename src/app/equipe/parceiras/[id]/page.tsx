import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PaginaEquipe } from "@/features/equipe/pagina";
import { Painel } from "@/features/estrutura/componentes";
import { listarParceiras, orgaosParaParceira } from "@/features/equipe/marca";
import { EquipeParceira } from "@/features/parceira/equipe";
import { pessoasDaEmpresa } from "@/features/parceira/dados";
import { formatarCnpj } from "@/features/prefeituras/lista";
import { Pilula } from "@/ui/canvas";
import { idSchema } from "@/features/login/esquemas";
import { exigirEquipe } from "@/features/sessao/dal";

export const metadata: Metadata = { title: "Empresa parceira · LicCONT" };

// Quadro EquipeParceiraDetalhe: a equipe LicCONT vê funcionários e alocação e as prefeituras vinculadas.
export default async function ParceiraDetalhe({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ editar?: string; convidar?: string }> }) {
  await exigirEquipe();
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();
  const q = await searchParams;
  const parceira = (await listarParceiras()).find((p) => p.id === id);
  if (!parceira) notFound();
  const [pessoas, orgaos] = await Promise.all([pessoasDaEmpresa(id), orgaosParaParceira(id)]);
  const ligadas = orgaos.filter((o) => o.ligada);
  return (
    <PaginaEquipe
      titulo={parceira.nome}
      trilha={
        <span>
          <Link href="/equipe" className="text-destaque hover:underline">Equipe LicCONT</Link>{" › "}
          <Link href="/equipe/prefeituras/parceiras" className="text-destaque hover:underline">Empresas parceiras</Link>{` › ${parceira.nome}`}
        </span>
      }
    >
      <Painel>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">{formatarCnpj(parceira.cnpj)}</p>
            <p className="text-xs text-texto-suave">
              {ligadas.length} {ligadas.length === 1 ? "prefeitura" : "prefeituras"} · {pessoas.length} {pessoas.length === 1 ? "pessoa" : "pessoas"}
            </p>
          </div>
          <span className="flex items-center gap-3">
            <Pilula tom={parceira.ativa ? "ok" : "erro"}>{parceira.ativa ? "Ativa" : "Inativa"}</Pilula>
            <Link href={`/equipe/prefeituras/parceiras?sel=${id}`} className="text-[13px] text-destaque hover:underline">Editar dados</Link>
          </span>
        </div>
      </Painel>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-4">
          <EquipeParceira
            pessoas={pessoas}
            prefeituras={ligadas.map((o) => ({ id: o.id, nome: o.nome }))}
            base={`/equipe/parceiras/${id}`}
            editar={q.editar}
            convidar={q.convidar === "1"}
            parceiraId={id}
            porEquipe
          />
        </div>
        <Painel>
          <h2 className="font-titulo text-base font-bold">Prefeituras atendidas</h2>
          <ul className="flex flex-col gap-2 text-sm">
            {ligadas.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-2">
                {o.nome}
                <Pilula tom="ok">Vinculada</Pilula>
              </li>
            ))}
          </ul>
          <Link href={`/equipe/prefeituras/parceiras?sel=${id}`} className="text-[13px] text-destaque hover:underline">+ Vincular prefeitura</Link>
          <p className="text-xs text-texto-suave">Cada prefeitura tem uma empresa parceira. O logo dela sai no rodapé das etiquetas.</p>
        </Painel>
      </div>
    </PaginaEquipe>
  );
}
