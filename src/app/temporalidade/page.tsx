import type { Metadata } from "next";
import { Pilula } from "@/ui/canvas";
import { CartaoNumero, Etiqueta, Painel, TituloPainel, classeLinha, linhaCabecalho, th } from "@/features/estrutura/componentes";
import { numeroBR } from "@/features/estrutura/ocupacao";
import { exigirSessao } from "@/features/sessao/dal";
import { PaginaSistema } from "@/features/sessao/pagina";
import { lerTemporalidade } from "@/features/movimento/dados";
import { BotaoBreve, LinhaVazia } from "@/features/movimento/ui";

export const metadata: Metadata = { title: "Temporalidade · LicCONT" };

export default async function Temporalidade() {
  const { usuario, secretaria } = await exigirSessao();
  const { resumo, regras, prontos } = await lerTemporalidade();
  const colunas = ["Tipo de documento", "Fase corrente", "Intermediária", "Destinação final"];

  return (
    <PaginaSistema usuario={usuario} secretaria={secretaria} titulo="Temporalidade e descarte" trilha="Acervo · Prazos de guarda" acoes={<BotaoBreve>Nova regra de prazo</BotaoBreve>}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <CartaoNumero rotulo="Vencem em 90 dias" valor={numeroBR(resumo.vencem90)} legenda="avisar o responsável do setor" cor="ambar" icone="sol" serie={[resumo.vencem90]} />
        <CartaoNumero rotulo="Prontos para eliminação" valor={numeroBR(resumo.prontos)} legenda="prazo de guarda já cumprido" cor="vermelho" icone="caixa" serie={[resumo.prontos]} />
        <CartaoNumero rotulo="Guarda permanente" valor={numeroBR(resumo.permanentes)} legenda="não podem ser descartados" cor="aco" icone="folha" serie={[resumo.permanentes]} />
      </div>

      <div className="grid items-stretch gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Painel>
          <div className="flex items-start justify-between gap-3">
            <div>
              <TituloPainel>Tabela de temporalidade</TituloPainel>
              <p className="mt-0.5 text-xs text-texto-suave">Prazos de exemplo. Cada prefeitura cadastra a sua tabela oficial.</p>
            </div>
            <BotaoBreve>Editar tabela</BotaoBreve>
          </div>
          <div className="-mx-5 overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className={linhaCabecalho}>
                  {colunas.map((c) => (
                    <th key={c} scope="col" className={`${th} px-5`}>
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {regras.length === 0 && <LinhaVazia colunas={colunas.length}>Nenhuma regra de prazo cadastrada.</LinhaVazia>}
                {regras.map((r, i) => (
                  <tr key={r.tipo} className={classeLinha(false, i % 2 === 1)}>
                    <td className="px-5 py-3 text-sm">{r.tipo}</td>
                    <td className="px-5 py-3 text-sm whitespace-nowrap">{r.corrente}</td>
                    <td className="px-5 py-3 text-sm whitespace-nowrap">{r.intermediaria}</td>
                    <td className="px-5 py-3">{r.permanente ? <Pilula tom="ok">Guarda permanente</Pilula> : <Etiqueta>Eliminação</Etiqueta>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Painel>

        <Painel>
          <div className="flex items-center justify-between gap-3">
            <TituloPainel>Prontos para eliminação</TituloPainel>
            <Pilula tom="aviso">{resumo.prontos === 1 ? "1 documento" : `${resumo.prontos} documentos`}</Pilula>
          </div>
          {prontos.length === 0 && <p className="text-sm text-texto-suave">Nenhum documento pronto para eliminação.</p>}
          <ul className="flex flex-col gap-1">
            {prontos.map((d) => (
              <li
                key={d.id}
                className={`flex items-center gap-3 rounded-[10px] px-3 py-2.5 ${d.marcado ? "bg-[linear-gradient(90deg,rgba(45,212,191,.2),rgba(45,212,191,0))]" : ""}`}
              >
                <span
                  aria-hidden
                  className={`flex size-5 shrink-0 items-center justify-center rounded-md border-[1.5px] ${d.marcado ? "border-[#2dd4bf] bg-[#2dd4bf]" : "border-linha"}`}
                >
                  {d.marcado && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0b2e3a" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12.5l4.5 4.5L19 7" />
                    </svg>
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{d.titulo}</p>
                  <p className="font-mono text-xs font-medium text-texto-suave">{d.caixa}</p>
                </div>
                <span className="text-xs whitespace-nowrap text-texto-suave">venceu {d.venceu}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs leading-[18px] text-texto-suave">
            Marque os documentos aprovados pela comissão. O sistema gera a listagem e o termo de eliminação, e registra tudo na auditoria.
          </p>
          <BotaoBreve variante="primario" className="w-full">
            Gerar termo de eliminação
          </BotaoBreve>
          <BotaoBreve className="w-full">Imprimir listagem</BotaoBreve>
        </Painel>
      </div>
    </PaginaSistema>
  );
}
