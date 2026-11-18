import type { Metadata } from "next";
import { exigirSessao } from "@/features/sessao/dal";
import { PaginaSistema } from "@/features/sessao/pagina";
import { podeCadastrar } from "@/features/documentos/dados";
import { lerBaseEtiquetas } from "@/features/etiquetas/dados";
import { lerCaixasDaUrl } from "@/features/etiquetas/esquemas";
import { TelaEtiquetas } from "@/features/etiquetas/tela";

export const metadata: Metadata = { title: "Etiquetas · LicCONT" };

export default async function Etiquetas({ searchParams }: { searchParams: Promise<{ caixas?: string; documentos?: string }> }) {
  const { usuario, secretaria } = await exigirSessao();
  const { caixas, documentos } = await searchParams;
  const [base, pode] = await Promise.all([lerBaseEtiquetas(), podeCadastrar(usuario)]);
  return (
    <PaginaSistema usuario={usuario} secretaria={secretaria} titulo="Etiquetas" trilha="Acervo · Impressão">
      <TelaEtiquetas base={base} caixasMarcadas={lerCaixasDaUrl(caixas)} documentosMarcados={lerCaixasDaUrl(documentos)} podeImprimir={pode} />
    </PaginaSistema>
  );
}
