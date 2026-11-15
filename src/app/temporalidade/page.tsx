import type { Metadata } from "next";
import Link from "next/link";
import { Pilula } from "@/ui/canvas";
import { CartaoNumero, Etiqueta, Painel, TituloPainel, classeLinha, linhaCabecalho, th } from "@/features/estrutura/componentes";
import { numeroBR } from "@/features/estrutura/ocupacao";
import { exigirSessao } from "@/features/sessao/dal";
import { PaginaSistema } from "@/features/sessao/pagina";
import { lerTemporalidade } from "@/features/movimento/dados";
import { LinhaVazia } from "@/features/movimento/ui";
import { lerRegras, listarTermos, podeGerarTermo } from "@/features/temporalidade/dados";
import { DialogoRegra } from "@/features/temporalidade/dialogo-regra";
import { FilaEliminacao } from "@/features/temporalidade/fila";
import { ROTULO_SITUACAO } from "@/features/temporalidade/rotulos";

export const metadata: Metadata = { title: "Temporalidade · LicCONT" };

export default async function Temporalidade() {
  const { usuario, secretaria } = await exigirSessao();
  const [{ resumo, regras, prontos }, regrasEditaveis, termos, podeGerar] = await Promise.all([lerTemporalidade(), lerRegras(), listarTermos(), podeGerarTermo(usuario)]);
  const colunas = ["Tipo de documento", "Fase corrente", "Intermediária", "Destinação final"];

  return (
    <PaginaSistema usuario={usuario} secretaria={secretaria} titulo="Temporalidade e descarte" trilha="Acervo · Prazos de guarda" acoes={usuario.administrador ? <DialogoRegra rotulo="Nova regra de prazo" regras={regrasEditaveis} /> : undefined}>
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
            {usuario.administrador && <DialogoRegra rotulo="Editar tabela" regras={regrasEditaveis} />}
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
          <FilaEliminacao prontos={prontos} podeGerar={podeGerar} />
        </Painel>
      </div>

      {termos.length > 0 && (
        <Painel>
          <TituloPainel>Termos de eliminação</TituloPainel>
          <ul className="flex flex-col gap-1">
            {termos.map((t) => (
              <li key={t.id}>
                <Link href={`/temporalidade/termo/${t.id}`} className="flex items-center gap-3 rounded-[10px] px-3 py-2.5 hover:bg-superficie-2">
                  <span className="min-w-0 flex-1 text-sm font-semibold">
                    Termo {String(t.numero).padStart(3, "0")}/{t.ano} · {t.itens} {t.itens === 1 ? "documento" : "documentos"}
                  </span>
                  {t.situacao === "cancelado" ? <Etiqueta>{ROTULO_SITUACAO[t.situacao]}</Etiqueta> : <Pilula tom={t.situacao === "aprovado" ? "ok" : "aviso"}>{ROTULO_SITUACAO[t.situacao]}</Pilula>}
                </Link>
              </li>
            ))}
          </ul>
        </Painel>
      )}
    </PaginaSistema>
  );
}
