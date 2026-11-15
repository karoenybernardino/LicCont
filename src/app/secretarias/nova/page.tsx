import type { Metadata } from "next";
import Link from "next/link";
import { exigirAdmin } from "@/features/sessao/dal";
import { PaginaSistema } from "@/features/sessao/pagina";
import { cadastrarSecretaria } from "@/features/secretarias/acoes";
import { listarRuasParaEscolha } from "@/features/secretarias/dados";
import { FormularioSecretaria } from "@/features/secretarias/formulario";
import { listarUsuarios } from "@/features/usuarios/dados";

export const metadata: Metadata = { title: "Nova secretaria · LicCONT" };

export default async function NovaSecretaria() {
  const { usuario, secretaria } = await exigirAdmin();
  const [usuarios, ruas] = await Promise.all([listarUsuarios(), listarRuasParaEscolha()]);
  return (
    <PaginaSistema
      usuario={usuario}
      secretaria={secretaria}
      titulo="Nova secretaria"
      trilha={<>Prefeitura › <Link href="/secretarias" className="text-destaque underline-offset-2 hover:underline">Secretarias</Link> › <b className="font-semibold text-texto">Nova secretaria</b></>}
    >
      <FormularioSecretaria acao={cadastrarSecretaria} usuarios={usuarios.filter((u) => u.ativo)} ruas={ruas} />
    </PaginaSistema>
  );
}
