import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { exigirSessao, nomePrefeitura } from "@/features/sessao/dal";
import { PaginaSistema } from "@/features/sessao/pagina";
import { limitePdfMb, opcoesEstrutura, secretariasParaCadastro } from "@/features/documentos/dados";
import { FormularioDocumento } from "@/features/documentos/formulario";
import { lerRegras } from "@/features/temporalidade/dados";
import { listarGrupos, listarTipologias } from "@/features/classificacao/dados";

export const metadata: Metadata = { title: "Cadastrar documento · LicCONT" };

export default async function NovoDocumento({ searchParams }: { searchParams: Promise<{ salvo?: string }> }) {
  const { usuario, secretaria } = await exigirSessao();
  const secretarias = await secretariasParaCadastro(usuario);
  // Consulta só pesquisa: a tela nem abre (e a ação também recusa no servidor).
  if (!secretarias.length) redirect("/pesquisa");
  const [estrutura, prefeitura, limiteMb, regras, grupos, tipologias, { salvo }] = await Promise.all([
    opcoesEstrutura(),
    nomePrefeitura(usuario),
    limitePdfMb(usuario),
    lerRegras(),
    listarGrupos(),
    listarTipologias(),
    searchParams,
  ]);
  const padrao = secretarias.find((s) => s.id === secretaria.id)?.id ?? secretarias[0].id;
  return (
    <PaginaSistema usuario={usuario} secretaria={secretaria} titulo="Cadastrar documento" trilha="Acervo · Novo" acoes={
        <>
          {usuario.administrador && (
            <Link href="/cadastro/importar" className="inline-flex min-h-10 items-center rounded-lg border border-linha px-5 text-sm font-medium text-texto">
              Importar do GED ou planilha
            </Link>
          )}
          <Link href="/documentos/lote" className="inline-flex min-h-10 items-center rounded-lg border border-linha px-5 text-sm font-medium text-texto">
            Enviar vários PDFs
          </Link>
        </>
      }>
      {salvo && (
        <p role="status" className="rounded-lg border border-linha bg-superficie-2 p-3 text-sm">
          Documento salvo. Cadastre o próximo.
        </p>
      )}
      <FormularioDocumento
        secretarias={secretarias}
        secretariaPadrao={padrao}
        estrutura={estrutura}
        prefeitura={prefeitura}
        limiteMb={limiteMb}
        regras={regras}
        grupos={grupos}
        tipologias={tipologias}
      />
    </PaginaSistema>
  );
}
