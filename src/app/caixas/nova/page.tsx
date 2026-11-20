import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { exigirSessao } from "@/features/sessao/dal";
import { PaginaSistema } from "@/features/sessao/pagina";
import { opcoesEstrutura, secretariasParaCadastro } from "@/features/documentos/dados";
import { FormularioCaixa } from "@/features/documentos/formulario-caixa";
import { lerRegras } from "@/features/temporalidade/dados";
import { listarTipologias } from "@/features/classificacao/dados";

export const metadata: Metadata = { title: "Cadastrar caixa · LicCONT" };

export default async function NovaCaixa() {
  const { usuario, secretaria } = await exigirSessao();
  // Mesma regra do cadastro de documento: consulta só pesquisa (a ação também confere no servidor).
  if (!(await secretariasParaCadastro(usuario)).length) redirect("/pesquisa");
  const [estrutura, regras, tipologias] = await Promise.all([opcoesEstrutura(), lerRegras(), listarTipologias()]);
  return (
    <PaginaSistema
      usuario={usuario}
      secretaria={secretaria}
      titulo="Cadastrar caixa"
      trilha="Acervo · Nova caixa"
      acoes={
        <Link href="/documentos/novo" className="inline-flex min-h-10 items-center rounded-lg border border-linha px-5 text-sm font-medium text-texto">
          Cadastrar documento
        </Link>
      }
    >
      <FormularioCaixa estrutura={estrutura} regras={regras} tipologias={tipologias} />
    </PaginaSistema>
  );
}
