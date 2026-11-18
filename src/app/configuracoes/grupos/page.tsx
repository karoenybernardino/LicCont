import type { Metadata } from "next";
import { exigirAdmin } from "@/features/sessao/dal";
import { PaginaSistema } from "@/features/sessao/pagina";
import { listarGrupos, listarTipologias, papeisPorGrupo } from "@/features/classificacao/dados";
import { EditorGrupos } from "@/features/classificacao/editor";

export const metadata: Metadata = { title: "Grupos documentais · LicCONT" };

// Grupos e tipologias do órgão. Todo documento pertence a um grupo; RH e jurídico nascem restritos.
export default async function GruposDocumentais() {
  const { usuario, secretaria } = await exigirAdmin();
  const [grupos, tipologias, papeis] = await Promise.all([listarGrupos(), listarTipologias(), papeisPorGrupo()]);
  return (
    <PaginaSistema usuario={usuario} secretaria={secretaria} titulo="Grupos documentais" trilha="Configurações › Grupos documentais">
      <p className="max-w-3xl text-sm text-texto-suave">
        Todo documento pertence a um grupo. Em grupo restrito, só o administrador e os perfis marcados veem os documentos, os PDFs, a busca, as etiquetas e os relatórios.
        Grupos e tipologias não se apagam: só se desativam.
      </p>
      <EditorGrupos grupos={grupos} tipologias={tipologias} papeis={papeis} />
    </PaginaSistema>
  );
}
