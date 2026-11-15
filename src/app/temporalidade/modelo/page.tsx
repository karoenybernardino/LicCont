import type { Metadata } from "next";
import Link from "next/link";
import { Painel, TituloPainel } from "@/features/estrutura/componentes";
import { exigirAdmin } from "@/features/sessao/dal";
import { PaginaSistema } from "@/features/sessao/pagina";
import { lerModelo } from "@/features/temporalidade/dados";
import { FormularioModelo } from "@/features/temporalidade/formulario-modelo";
import { BOTAO_CONTORNO } from "@/features/temporalidade/ui";

export const metadata: Metadata = { title: "Modelo do termo · LicCONT" };

// Só o administrador edita o texto do termo de eliminação da prefeitura.
export default async function ModeloDoTermo({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { usuario, secretaria } = await exigirAdmin();
  const tipo = (await searchParams).tipo === "emprestimo" ? "emprestimo" : "eliminacao";
  const modelo = await lerModelo(tipo);
  return (
    <PaginaSistema
      usuario={usuario}
      secretaria={secretaria}
      titulo="Modelo do termo"
      trilha="Acervo · Prazos de guarda"
      acoes={
        <Link href="/temporalidade" className={BOTAO_CONTORNO}>
          Voltar
        </Link>
      }
    >
      <Painel>
        <div className="flex gap-2.5 text-sm">
          <Link href="/temporalidade/modelo" aria-current={tipo === "eliminacao" ? "page" : undefined} className={`underline-offset-4 ${tipo === "eliminacao" ? "font-semibold underline" : ""}`}>
            Termo de eliminação
          </Link>
          <Link href="/temporalidade/modelo?tipo=emprestimo" aria-current={tipo === "emprestimo" ? "page" : undefined} className={`underline-offset-4 ${tipo === "emprestimo" ? "font-semibold underline" : ""}`}>
            Termo de empréstimo
          </Link>
        </div>
        <TituloPainel>{tipo === "emprestimo" ? "Texto do termo de empréstimo" : "Texto do termo de eliminação"}</TituloPainel>
        <p className="text-sm text-texto-suave">
          O texto-base e as linhas de assinatura saem no PDF e no Word. As frases sobre datas, prazo e situação
          são geradas pelo sistema e não mudam, para o termo nunca dizer o que não aconteceu. Não escreva nome nem CPF de
          pessoa aqui. Confirme o texto com o jurídico da prefeitura.
        </p>
        <FormularioModelo key={tipo} tipo={tipo} baseLegal={modelo.baseLegal} assinaturas={modelo.assinaturas} />
      </Painel>
    </PaginaSistema>
  );
}
