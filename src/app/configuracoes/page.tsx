import type { Metadata } from "next";
import Link from "next/link";
import { Painel, TituloPainel } from "@/features/estrutura/componentes";
import { exigirAdmin } from "@/features/sessao/dal";
import { AJUSTES, Icone, PaginaSistema } from "@/features/sessao/pagina";

export const metadata: Metadata = { title: "Configurações · LicCONT" };

export default async function Configuracoes() {
  const { usuario, secretaria } = await exigirAdmin();
  return (
    <PaginaSistema usuario={usuario} secretaria={secretaria} titulo="Configurações" trilha="Prefeitura › Configurações">
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {AJUSTES.map((a) => (
          <li key={a.href}>
            <Link href={a.href!} className="block h-full rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aqua">
              <Painel className="h-full hover:border-aqua">
                <span className="flex size-10 items-center justify-center rounded-full bg-[#285a66] text-white">
                  <Icone nome={a.icone} />
                </span>
                <TituloPainel>{a.rotulo}</TituloPainel>
                <p className="text-sm text-texto-suave">{a.dica}</p>
              </Painel>
            </Link>
          </li>
        ))}
      </ul>
    </PaginaSistema>
  );
}
