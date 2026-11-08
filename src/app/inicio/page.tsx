import type { Metadata } from "next";
import { Cartao } from "@/ui/cartao";
import { CabecalhoSistema } from "@/features/sessao/cabecalho";
import { exigirSessao } from "@/features/sessao/dal";
import { SeletorSecretaria } from "@/features/sessao/seletor-secretaria";

export const metadata: Metadata = { title: "Início · LicCONT" };

export default async function Inicio() {
  const { usuario, secretaria } = await exigirSessao();
  return (
    <>
      <CabecalhoSistema>
        <SeletorSecretaria usuario={usuario} atual={secretaria} />
      </CabecalhoSistema>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
        <h1 className="text-2xl">Início</h1>
        <Cartao className="flex flex-col gap-2">
          <p>Olá, {usuario.nome}.</p>
          <p className="text-texto-suave">O cadastro e a pesquisa do acervo chegam nas próximas fases.</p>
        </Cartao>
      </main>
    </>
  );
}
