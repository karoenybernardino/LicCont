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
export default async function ModeloDoTermo() {
  const { usuario, secretaria } = await exigirAdmin();
  const modelo = await lerModelo();
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
        <TituloPainel>Texto do termo de eliminação</TituloPainel>
        <p className="text-sm text-texto-suave">
          O texto-base e as linhas de assinatura saem no PDF e no Word. As frases sobre o edital, o prazo e a aprovação
          são geradas pelo sistema e não mudam, para o termo nunca dizer o que não aconteceu. Não escreva nome nem CPF de
          pessoa aqui. Confirme o texto com o jurídico da prefeitura.
        </p>
        <FormularioModelo baseLegal={modelo.baseLegal} assinaturas={modelo.assinaturas} />
      </Painel>
    </PaginaSistema>
  );
}
