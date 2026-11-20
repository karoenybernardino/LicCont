import type { Metadata } from "next";
import { Painel, classeLinha, linhaCabecalho, td, th } from "@/features/estrutura/componentes";
import { botaoPrimario } from "@/ui/canvas";
import { PaginaParceira } from "@/features/parceira/pagina";
import { escolherPrefeitura, exigirParceira, pesquisarDocumentos, prefeiturasDaEmpresa } from "@/features/parceira/dados";

export const metadata: Metadata = { title: "Pesquisa · Empresa parceira · LicCONT" };

// Quadro PartPesquisa: uma prefeitura por vez, só entre as permitidas. Sem empréstimo.
// Versão enxuta: busca por texto; filtros e abertura do PDF ficam para uma próxima etapa.
export default async function PesquisaParceira({ searchParams }: { searchParams: Promise<{ p?: string; q?: string }> }) {
  const eu = await exigirParceira();
  const { p, q } = await searchParams;
  const prefeituras = await prefeiturasDaEmpresa();
  const atual = escolherPrefeitura(p, prefeituras, false);
  const termo = (q ?? "").slice(0, 80);
  const docs = atual ? await pesquisarDocumentos(atual, termo) : [];
  return (
    <PaginaParceira eu={eu} titulo="Pesquisa" prefeituras={prefeituras} atual={atual}>
      <Painel>
        <form role="search" className="flex flex-wrap items-center gap-3">
          <input type="hidden" name="p" value={atual} />
          <input name="q" defaultValue={termo} aria-label="Buscar por número, objeto ou empresa" placeholder="Número, objeto ou empresa" className="min-h-10 min-w-0 flex-1 rounded-lg border border-borda-campo bg-campo px-3 text-sm" />
          <button className={botaoPrimario}>Pesquisar</button>
        </form>
        <p className="text-sm text-texto-suave">
          {docs.length} {docs.length === 1 ? "resultado" : "resultados"}
        </p>
        <div className="-mx-5 overflow-x-auto">
          <table className="w-full border-collapse">
            <caption className="sr-only">Documentos encontrados</caption>
            <thead>
              <tr className={linhaCabecalho}>
                <th scope="col" className={th}>Tipo</th>
                <th scope="col" className={th}>Número</th>
                <th scope="col" className={th}>Objeto</th>
                <th scope="col" className={th}>Caixa</th>
              </tr>
            </thead>
            <tbody>
              {docs.map((d, i) => (
                <tr key={d.id} className={classeLinha(false, i % 2 === 1)}>
                  <td className={td}>{d.tipo === "licitacao" ? "Licitação" : "Contrato"}</td>
                  <td className={`${td} font-mono`}>{d.numero}/{d.ano}</td>
                  <td className={`${td} max-w-[420px] truncate`}>{d.objeto}</td>
                  <td className={`${td} font-mono`}>{d.caixa}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Painel>
    </PaginaParceira>
  );
}
