import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { idSchema } from "@/features/login/esquemas";
import { exigirAdmin } from "@/features/sessao/dal";
import { PaginaSistema } from "@/features/sessao/pagina";
import { salvarSecretaria } from "@/features/secretarias/acoes";
import { listarRuasParaEscolha, listarSecretariasDetalhe } from "@/features/secretarias/dados";
import { FormularioSecretaria } from "@/features/secretarias/formulario";
import { listarUsuarios } from "@/features/usuarios/dados";

export const metadata: Metadata = { title: "Editar secretaria · LicCONT" };

export default async function EditarSecretaria({ params }: PageProps<"/secretarias/[id]">) {
  const { usuario, secretaria } = await exigirAdmin();
  const id = idSchema.safeParse((await params).id);
  if (!id.success) notFound();
  const [[alvo], usuarios, ruas] = await Promise.all([listarSecretariasDetalhe(id.data), listarUsuarios(), listarRuasParaEscolha()]);
  if (!alvo) notFound();
  return (
    <PaginaSistema
      usuario={usuario}
      secretaria={secretaria}
      titulo={alvo.nome}
      trilha={<>Prefeitura › <Link href="/secretarias" className="text-destaque underline-offset-2 hover:underline">Secretarias</Link> › <b className="font-semibold text-texto">Editar</b></>}
    >
      <FormularioSecretaria acao={salvarSecretaria} inicial={alvo} usuarios={usuarios.filter((u) => u.ativo || u.id === alvo.responsavelId)} ruas={ruas} />
    </PaginaSistema>
  );
}
