import type { Metadata } from "next";
import { Cartao } from "@/ui/cartao";
import { exigirSessao } from "@/features/sessao/dal";
import { PaginaSistema } from "@/features/sessao/pagina";

export const metadata: Metadata = { title: "Início · LicCONT" };

export default async function Inicio() {
  const { usuario, secretaria } = await exigirSessao();
  return (
    <PaginaSistema usuario={usuario} secretaria={secretaria} titulo="Início">
      <Cartao className="flex flex-col gap-2">
        <p>Olá, {usuario.nome}.</p>
        <p className="text-texto-suave">O cadastro e a pesquisa do acervo chegam nas próximas fases.</p>
      </Cartao>
    </PaginaSistema>
  );
}
