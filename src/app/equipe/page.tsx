import type { Metadata } from "next";
import { Cartao } from "@/ui/cartao";
import { CabecalhoSistema } from "@/features/sessao/cabecalho";
import { exigirEquipe } from "@/features/sessao/dal";

export const metadata: Metadata = { title: "Equipe · LicCONT" };

export default async function PainelEquipe() {
  await exigirEquipe();
  return (
    <>
      <CabecalhoSistema />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
        <h1 className="text-2xl">Equipe LicCONT</h1>
        <Cartao>
          <p className="text-texto-suave">O cadastro de prefeituras chega na próxima entrega.</p>
        </Cartao>
      </main>
    </>
  );
}
