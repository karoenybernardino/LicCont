import type { Metadata } from "next";
import Link from "next/link";
import { CartaoResumo, botaoPrimario } from "@/ui/canvas";
import { PaginaEquipe } from "@/features/equipe/pagina";
import { Painel, classeLinha, linhaCabecalho, td, th } from "@/features/estrutura/componentes";
import { listarPrefeituras, recusadosNoMes, usoPrefeituras } from "@/features/prefeituras/dados";
import { totaisUso } from "@/features/prefeituras/uso";
import { Icone } from "@/features/sessao/barra-lateral";
import { exigirEquipe } from "@/features/sessao/dal";

export const metadata: Metadata = { title: "Uso do mês · LicCONT" };

const n = (v: number) => v.toLocaleString("pt-BR");

// Relatório mensal de uso da equipe: só números, nunca conteúdo do acervo.
export default async function UsoDoMes() {
  await exigirEquipe();
  const [prefeituras, uso, recusados] = await Promise.all([listarPrefeituras(), usoPrefeituras(), recusadosNoMes()]);
  const linhas = prefeituras.map((p) => ({ nome: p.nome, status: p.status, uso: uso.get(p.id) }));
  const t = totaisUso(linhas);
  return (
    <PaginaEquipe titulo="Uso do mês" trilha={<Link href="/equipe" className="text-destaque hover:underline">Equipe LicCONT</Link>}>
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <CartaoResumo rotulo="Prefeituras ativas" valor={n(t.ativas)} legenda={`de ${n(t.prefeituras)} cadastradas`} cor="teal" icone={<Icone nome="secretarias" />} />
        <CartaoResumo rotulo="Usuários ativos" valor={n(t.usuarios)} legenda="em todas as prefeituras" cor="aco" icone={<Icone nome="usuarios" />} />
        <CartaoResumo rotulo="Logins no mês" valor={n(t.loginsMes)} legenda={`${n(recusados)} tentativas recusadas`} cor="ambar" icone={<Icone nome="auditoria" />} />
        <CartaoResumo rotulo="Armazenamento" valor={`${(t.bytesPdf / 1e9).toFixed(2)} GB`} legenda={`${n(t.documentos)} documentos`} cor="vermelho" icone={<Icone nome="cadastro" />} />
      </div>
      <Painel>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-[11px] font-medium tracking-[.05em] text-texto-suave uppercase">Por prefeitura (só números)</span>
          <Link href="/equipe/uso/baixar" prefetch={false} className={botaoPrimario}>Baixar planilha</Link>
        </div>
        <div className="-mx-5 overflow-x-auto">
          <table className="w-full text-left">
            <caption className="sr-only">Uso por prefeitura no mês</caption>
            <thead>
              <tr className={linhaCabecalho}>
                {["Prefeitura", "Usuários", "Documentos", "Caixas", "PDFs (GB)", "Logins no mês"].map((c) => (
                  <th key={c} scope="col" className={th}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {linhas.map((l, i) => (
                <tr key={l.nome} className={classeLinha(false, i % 2 === 1)}>
                  <td className={`${td} font-semibold`}>{l.nome}</td>
                  <td className={`${td} font-mono text-[13px]`}>{n(l.uso?.usuarios ?? 0)}</td>
                  <td className={`${td} font-mono text-[13px]`}>{n(l.uso?.documentos ?? 0)}</td>
                  <td className={`${td} font-mono text-[13px]`}>{n(l.uso?.caixas ?? 0)}</td>
                  <td className={`${td} font-mono text-[13px]`}>{((l.uso?.bytesPdf ?? 0) / 1e9).toFixed(2)}</td>
                  <td className={`${td} font-mono text-[13px]`}>{n(l.uso?.loginsMes ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Painel>
    </PaginaEquipe>
  );
}
