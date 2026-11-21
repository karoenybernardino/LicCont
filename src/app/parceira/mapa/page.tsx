import type { Metadata } from "next";
import { BarraOcupacao, Painel } from "@/features/estrutura/componentes";
import { Pilula } from "@/ui/canvas";
import { PaginaParceira } from "@/features/parceira/pagina";
import { capacidadeDaPrefeitura, escolherPrefeitura, exigirParceira, prefeiturasDaEmpresa } from "@/features/parceira/dados";

export const metadata: Metadata = { title: "Mapa 3D · Empresa parceira · LicCONT" };

// Quadro PartMapa: uma prefeitura por vez. Versão enxuta: ocupação por rua (o mapa 3D completo
// do sistema depende da sessão da prefeitura e fica para uma próxima etapa). Sem empréstimo.
export default async function MapaParceira({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const eu = await exigirParceira();
  const { p } = await searchParams;
  const prefeituras = await prefeiturasDaEmpresa();
  const atual = escolherPrefeitura(p, prefeituras, false);
  const cap = atual ? await capacidadeDaPrefeitura(atual, prefeituras) : null;
  return (
    <PaginaParceira eu={eu} titulo="Mapa 3D do galpão" prefeituras={prefeituras} atual={atual}>
      {cap ? (
        <>
          <Painel>
            <h2 className="font-titulo text-base font-bold">Ocupação do arquivo</h2>
            <p className="text-sm">
              {cap.ocupadas} de {cap.total} caixas ({cap.percentual}%) · {cap.livres} livres {cap.alerta && <Pilula tom="aviso">Acima de 90%</Pilula>}
            </p>
            <BarraOcupacao percentual={cap.percentual} />
          </Painel>
          <Painel>
            <h2 className="font-titulo text-base font-bold">Por rua</h2>
            <ul className="flex flex-col gap-2">
              {cap.porRua.map((b) => (
                <li key={b.rotulo} className="grid grid-cols-[90px_1fr_120px] items-center gap-3 text-sm">
                  <span>{b.rotulo}</span>
                  <BarraOcupacao percentual={b.percentual} />
                  <span className="font-mono text-xs text-texto-suave">{b.ocupadas}/{b.total}</span>
                </li>
              ))}
            </ul>
          </Painel>
        </>
      ) : (
        <p className="text-sm text-texto-suave">Nenhuma prefeitura disponível para você.</p>
      )}
    </PaginaParceira>
  );
}
