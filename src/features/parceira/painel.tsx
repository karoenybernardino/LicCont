import Link from "next/link";
import { CartaoResumo, Pilula, botaoContorno } from "@/ui/canvas";
import { BarraOcupacao, Painel, classeLinha, linhaCabecalho, td, th } from "@/features/estrutura/componentes";
import type { Eu } from "./dados";
import { caixasPorOrgao, emAlertaDeOcupacao, etiquetas, evolucaoCaixas, ocupacaoDe, producaoPorPessoa, totaisPorPessoa, type Linha, type Resumo } from "./indicadores";

const n = (v: number) => v.toLocaleString("pt-BR");
// Data curta (dd/mm) do instante, no fuso de Fortaleza.
const dataCurta = (iso: string | null) => (iso ? new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Fortaleza" }).format(new Date(iso)) : "—");
const semana = (dia: string) => dataCurta(`${dia}T12:00:00Z`);

const icone = (d: string) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);
const I_PASTA = "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z";
const I_FOLHA = "M6 3h12v18H6zM9 8h6M9 12h6M9 16h3";
const I_QR = "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 14h2v2M14 18h2v2M18 18h2v2";
const I_DOC = "M5 3h9l5 5v13H5zM14 3v5h5M8 13h8M8 17h6";

type Props = {
  eu: Eu;
  /** Prefeituras permitidas (o servidor já filtrou). */
  prefeituras: Resumo[];
  /** Só as do recorte do seletor. */
  recorte: Resumo[];
  linhas: Linha[];
  funcionarios: number;
  hoje: string;
  evolucao: "semana" | "mes";
  producao: "dia" | "semana";
  base: string;
};

function Alerta({ r }: { r: Pick<Resumo, "caixas" | "modulos" | "caixasPorModulo"> }) {
  const o = ocupacaoDe(r);
  return (
    <div className="flex min-w-[150px] items-center gap-2">
      <div className="flex-1">
        <BarraOcupacao percentual={o.percentual} />
      </div>
      {o.alerta && <Pilula tom="aviso">Acima de 90%</Pilula>}
    </div>
  );
}

export function PainelParceira({ eu, prefeituras, recorte, linhas, funcionarios, hoje, evolucao, producao, base }: Props) {
  const dono = eu.papel === "dono";
  const orgaos = caixasPorOrgao(recorte);
  const etq = etiquetas(linhas, recorte, `${hoje.slice(0, 7)}-01`);
  const ev = evolucaoCaixas(linhas, evolucao).slice(-8);
  const maxEv = Math.max(...ev.map((x) => x.total), 1);
  const prod = producaoPorPessoa(linhas, producao).slice(0, 12);
  const totais = totaisPorPessoa(linhas);
  const alertas = emAlertaDeOcupacao(recorte);
  const link = (ev: string, pr: string) => `${base}&ev=${ev}&pr=${pr}`;

  return (
    <>
      {alertas.length > 0 && (
        <p role="status" className="rounded-lg bg-[#fef3c7] px-4 py-2.5 text-sm font-medium text-[#7c2d12] dark:bg-[#3b2f0b] dark:text-[#fcd34d]">
          Ocupação acima de 90%: {alertas.map((a) => `${a.nome} (${a.percentual}%)`).join(", ")}.
        </p>
      )}
      <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <CartaoResumo rotulo={dono ? "Prefeituras atendidas" : "Minhas prefeituras"} valor={String(recorte.length)} legenda={dono ? "todas com vínculo ativo" : "em que você está alocada"} cor="teal" icone={icone(I_PASTA)} />
        {dono ? (
          <CartaoResumo rotulo="Funcionários" valor={String(funcionarios)} legenda="além do dono" cor="aco" icone={icone(I_FOLHA)} />
        ) : (
          <CartaoResumo rotulo="Caixas" valor={n(orgaos.total)} legenda={`${n(orgaos.prefeitura)} da Prefeitura · ${n(orgaos.camara)} da Câmara`} cor="aco" icone={icone(I_FOLHA)} />
        )}
        <CartaoResumo rotulo="Etiquetas impressas no mês" valor={n(etq.impressas)} legenda="caixas, documentos e folhas" cor="teal" icone={icone(I_QR)} />
        <CartaoResumo rotulo="Caixas a etiquetar" valor={n(etq.pendentes)} legenda={`em ${etq.prefeiturasComPendencia} ${etq.prefeiturasComPendencia === 1 ? "prefeitura" : "prefeituras"}`} cor="ambar" icone={icone(I_DOC)} />
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Painel className="pb-1.5">
          <div className="flex items-center justify-between gap-2.5">
            <div>
              <h2 className="font-titulo text-base font-bold">{dono ? "Prefeituras atendidas" : "Minhas prefeituras"}</h2>
              <p className="mt-0.5 text-xs text-texto-suave">{dono ? "Panorama de todas as prefeituras vinculadas à sua empresa." : "Só as prefeituras em que você está alocada."}</p>
            </div>
          </div>
          <div className="-mx-5 -mb-1.5 overflow-x-auto">
            <table className="w-full border-collapse">
              <caption className="sr-only">Prefeituras atendidas</caption>
              <thead>
                <tr className={linhaCabecalho}>
                  <th scope="col" className={th}>Prefeitura</th>
                  <th scope="col" className={th}>Caixas</th>
                  <th scope="col" className={th}>Documentos</th>
                  <th scope="col" className={th}>A etiquetar</th>
                  <th scope="col" className={th}>Funcionários</th>
                  <th scope="col" className={th}>Ocupação</th>
                  <th scope="col" className={th}>Última atividade</th>
                </tr>
              </thead>
              <tbody>
                {recorte.map((p, i) => (
                  <tr key={p.id} className={classeLinha(false, i % 2 === 1)}>
                    <td className={`${td} font-semibold`}>
                      <Link href={`/parceira?p=${p.id}`} className="hover:underline">{p.nome}</Link>
                    </td>
                    <td className={`${td} font-mono`}>{n(p.caixas)}</td>
                    <td className={`${td} font-mono`}>{n(p.documentos)}</td>
                    <td className={`${td} font-mono`}>{p.aEtiquetar > 0 ? <Pilula tom="aviso">{p.aEtiquetar} a etiquetar</Pilula> : "0"}</td>
                    <td className={td}>{p.funcionarios} {p.funcionarios === 1 ? "pessoa" : "pessoas"}</td>
                    <td className={td}><Alerta r={p} /></td>
                    <td className={td}>{dataCurta(p.ultimaAtividade)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Painel>

        {dono ? (
          <Painel>
            <h2 className="font-titulo text-base font-bold">Atividade recente</h2>
            <ul className="flex flex-col gap-3 text-sm">
              {totais.slice(0, 4).map((t) => (
                <li key={t.pessoa}>
                  <strong>{t.pessoa}</strong> cadastrou {n(t.caixas)} caixas e {n(t.documentos)} documentos e imprimiu {n(t.etiquetas)} etiquetas.
                  <div className="text-xs text-texto-suave">últimos 120 dias</div>
                </li>
              ))}
              {totais.length === 0 && <li className="text-texto-suave">Sem atividade registrada.</li>}
            </ul>
            <p className="text-xs text-texto-suave">Só números e ações. A empresa vê o que a prefeitura liberou para consulta.</p>
          </Painel>
        ) : (
          <Painel>
            <h2 className="font-titulo text-base font-bold">Para etiquetar</h2>
            <p className="text-xs text-texto-suave">As caixas mais antigas sem etiqueta, só das suas prefeituras.</p>
            <Link href="/etiquetas" className={botaoContorno}>Ver todas</Link>
            <p className="text-xs text-texto-suave">Você só vê as prefeituras em que está alocada. Para incluir outra, fale com o dono da empresa ou com a equipe LicCONT.</p>
          </Painel>
        )}
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-2">
        <Painel>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-titulo text-base font-bold">Caixas cadastradas</h2>
            <span className="flex gap-1.5">
              <Link href={link("semana", producao)} className={botaoContorno} aria-current={evolucao === "semana" ? "true" : undefined}>Semanal</Link>
              <Link href={link("mes", producao)} className={botaoContorno} aria-current={evolucao === "mes" ? "true" : undefined}>Mensal</Link>
            </span>
          </div>
          <p className="text-sm">
            Total {n(orgaos.total)} · Prefeitura {n(orgaos.prefeitura)} · Câmara {n(orgaos.camara)}
          </p>
          <ul className="flex flex-col gap-1.5 text-xs">
            {ev.map((x) => (
              <li key={x.periodo} className="flex items-center gap-2">
                <span className="w-16 shrink-0 text-texto-suave">{evolucao === "mes" ? `${x.periodo.slice(5)}/${x.periodo.slice(0, 4)}` : `sem. ${semana(x.periodo)}`}</span>
                <span aria-hidden className="h-2.5 rounded-[5px] bg-[linear-gradient(90deg,#2dd4bf,#0e7490)]" style={{ width: `${Math.max((x.total / maxEv) * 60, 2)}%` }} />
                <span className="font-mono">{x.total} <span className="text-texto-suave">({x.prefeitura} P · {x.camara} C)</span></span>
              </li>
            ))}
            {ev.length === 0 && <li className="text-texto-suave">Sem caixas cadastradas no período.</li>}
          </ul>
        </Painel>

        <Painel>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-titulo text-base font-bold">Produção por funcionário</h2>
            <span className="flex gap-1.5">
              <Link href={link(evolucao, "dia")} className={botaoContorno} aria-current={producao === "dia" ? "true" : undefined}>Por dia</Link>
              <Link href={link(evolucao, "semana")} className={botaoContorno} aria-current={producao === "semana" ? "true" : undefined}>Por semana</Link>
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <caption className="sr-only">Produção por funcionário</caption>
              <thead>
                <tr className={linhaCabecalho}>
                  <th scope="col" className={th}>{producao === "dia" ? "Dia" : "Semana de"}</th>
                  <th scope="col" className={th}>Pessoa</th>
                  <th scope="col" className={th}>Caixas</th>
                  <th scope="col" className={th}>Documentos</th>
                </tr>
              </thead>
              <tbody>
                {prod.map((x, i) => (
                  <tr key={`${x.pessoa}${x.periodo}`} className={classeLinha(false, i % 2 === 1)}>
                    <td className={td}>{semana(x.periodo)}</td>
                    <td className={td}>{x.pessoa}</td>
                    <td className={`${td} font-mono`}>{x.caixas}</td>
                    <td className={`${td} font-mono`}>{x.documentos}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Painel>
      </div>
    </>
  );
}
