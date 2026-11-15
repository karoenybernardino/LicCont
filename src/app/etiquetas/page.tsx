import type { Metadata } from "next";
import { exigirSessao } from "@/features/sessao/dal";
import { PaginaSistema } from "@/features/sessao/pagina";
import { podeCadastrar } from "@/features/documentos/dados";
import { listarCaixasParaEtiqueta } from "@/features/etiquetas/dados";
import { lerCaixasDaUrl } from "@/features/etiquetas/esquemas";
import { TelaEtiquetas } from "@/features/etiquetas/tela";

export const metadata: Metadata = { title: "Etiquetas · LicCONT" };

export default async function Etiquetas({ searchParams }: { searchParams: Promise<{ caixas?: string }> }) {
  const { usuario, secretaria } = await exigirSessao();
  const { caixas: marcadas } = await searchParams;
  const [caixas, pode] = await Promise.all([listarCaixasParaEtiqueta(), podeCadastrar(usuario)]);
  return (
    <PaginaSistema usuario={usuario} secretaria={secretaria} titulo="Etiquetas" trilha="Acervo · Impressão">
      <TelaEtiquetas caixas={caixas} marcadas={lerCaixasDaUrl(marcadas)} podeImprimir={pode} />
    </PaginaSistema>
  );
}
