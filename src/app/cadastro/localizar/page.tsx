import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { botaoContorno } from "@/ui/canvas";
import { exigirSessao } from "@/features/sessao/dal";
import { PaginaSistema } from "@/features/sessao/pagina";
import { opcoesEstrutura, secretariasParaCadastro } from "@/features/documentos/dados";
import { listarSemEndereco } from "@/features/importacao/dados";
import { Localizar } from "@/features/importacao/localizar";

export const metadata: Metadata = { title: "Localizar documentos · LicCONT" };

export default async function LocalizarPagina({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { usuario, secretaria } = await exigirSessao();
  const secretarias = await secretariasParaCadastro(usuario);
  if (!secretarias.length) redirect("/pesquisa");
  const p = await searchParams;
  const filtro = typeof p.secretaria === "string" && secretarias.some((s) => s.id === p.secretaria) ? p.secretaria : "";
  const [documentos, estrutura] = await Promise.all([listarSemEndereco(filtro || undefined), opcoesEstrutura()]);
  return (
    <PaginaSistema
      usuario={usuario}
      secretaria={secretaria}
      titulo="Localizar documentos importados"
      trilha="Acervo · Cadastro › Localizar"
      acoes={
        usuario.administrador ? (
          <Link href="/cadastro/importar" className={botaoContorno}>
            Importar mais
          </Link>
        ) : undefined
      }
    >
      <Localizar documentos={documentos} estrutura={estrutura} secretarias={secretarias.map((s) => ({ id: s.id, nome: s.nome }))} filtro={filtro} />
    </PaginaSistema>
  );
}
