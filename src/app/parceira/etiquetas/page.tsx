import type { Metadata } from "next";
import { Painel, classeLinha, linhaCabecalho, td, th } from "@/features/estrutura/componentes";
import { Pilula } from "@/ui/canvas";
import { PaginaParceira } from "@/features/parceira/pagina";
import { caixasAEtiquetar, escolherPrefeitura, exigirParceira, prefeiturasDaEmpresa } from "@/features/parceira/dados";

export const metadata: Metadata = { title: "Etiquetas · Empresa parceira · LicCONT" };

// Quadro PartEtiquetas: caixas sem etiqueta impressa. "Todas" só para o dono.
// Versão enxuta: a impressão (PDF) segue pela tela de etiquetas da prefeitura; aqui só a fila.
export default async function EtiquetasParceira({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const eu = await exigirParceira();
  const { p } = await searchParams;
  const prefeituras = await prefeiturasDaEmpresa();
  const todas = eu.papel === "dono";
  const atual = escolherPrefeitura(p, prefeituras, todas);
  const caixas = await caixasAEtiquetar(atual === "todas" ? null : atual, prefeituras);
  return (
    <PaginaParceira eu={eu} titulo="Etiquetas" prefeituras={prefeituras} atual={atual} todas={todas}>
      <Painel>
        <h2 className="font-titulo text-base font-bold">Caixas a etiquetar</h2>
        <p className="text-xs text-texto-suave">As caixas mais antigas sem etiqueta impressa, só das prefeituras que você pode ver.</p>
        <div className="-mx-5 overflow-x-auto">
          <table className="w-full border-collapse">
            <caption className="sr-only">Caixas a etiquetar</caption>
            <thead>
              <tr className={linhaCabecalho}>
                <th scope="col" className={th}>Caixa</th>
                <th scope="col" className={th}>Descrição</th>
                <th scope="col" className={th}>Prefeitura</th>
                <th scope="col" className={th}>Etiqueta</th>
              </tr>
            </thead>
            <tbody>
              {caixas.map((c, i) => (
                <tr key={c.id} className={classeLinha(false, i % 2 === 1)}>
                  <td className={`${td} font-mono`}>{c.rotulo}</td>
                  <td className={td}>{c.descricao}</td>
                  <td className={td}>{c.prefeitura}</td>
                  <td className={td}>
                    <Pilula tom="aviso">Não impressa</Pilula>
                  </td>
                </tr>
              ))}
              {caixas.length === 0 && (
                <tr>
                  <td colSpan={4} className={`${td} text-texto-suave`}>
                    Nenhuma caixa pendente.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Painel>
    </PaginaParceira>
  );
}
