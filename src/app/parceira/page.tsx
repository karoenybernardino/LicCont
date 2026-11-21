import type { Metadata } from "next";
import { PaginaParceira } from "@/features/parceira/pagina";
import { PainelParceira } from "@/features/parceira/painel";
import { atividade, escolherPrefeitura, exigirParceira, pessoasDaEmpresa, prefeiturasDaEmpresa } from "@/features/parceira/dados";

export const metadata: Metadata = { title: "Painel · Empresa parceira · LicCONT" };

// Quadros PartPainelDono e PartPainelFunc. O servidor só devolve as prefeituras permitidas à pessoa.
export default async function Painel({ searchParams }: { searchParams: Promise<{ p?: string; ev?: string; pr?: string }> }) {
  const eu = await exigirParceira();
  const q = await searchParams;
  const prefeituras = await prefeiturasDaEmpresa();
  const atual = escolherPrefeitura(q.p, prefeituras, true);
  const recorte = atual === "todas" ? prefeituras : prefeituras.filter((p) => p.id === atual);
  const [linhas, pessoas] = await Promise.all([atividade(atual === "todas" ? null : atual), eu.papel === "dono" ? pessoasDaEmpresa() : Promise.resolve([])]);
  const evolucao = q.ev === "mes" ? "mes" : "semana";
  const producao = q.pr === "semana" ? "semana" : "dia";
  return (
    <PaginaParceira eu={eu} titulo="Painel" prefeituras={prefeituras} atual={atual} todas>
      <PainelParceira
        eu={eu}
        prefeituras={prefeituras}
        recorte={recorte}
        linhas={linhas}
        funcionarios={pessoas.filter((p) => p.papel === "funcionario").length}
        hoje={new Date().toISOString().slice(0, 10)}
        evolucao={evolucao}
        producao={producao}
        base={`/parceira?p=${atual}`}
      />
    </PaginaParceira>
  );
}
