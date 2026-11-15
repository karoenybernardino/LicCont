import type { Metadata } from "next";
import Link from "next/link";
import { Formulario } from "@/ui/formulario";
import { Campo } from "@/ui/campo";
import { Selecao } from "@/ui/selecao";
import { Filtros, Pilula, botaoPrimario } from "@/ui/canvas";
import { PaginaEquipe } from "@/features/equipe/pagina";
import { Painel, TituloPainel, classeLinha, linhaCabecalho, td, th } from "@/features/estrutura/componentes";
import { atualizarPedido } from "@/features/equipe/acoes";
import { listarPedidos } from "@/features/equipe/dados";
import { SITUACOES_PEDIDO, formatarDiaHora, haTempo, type SituacaoPedido } from "@/features/equipe/textos";
import { exigirEquipe } from "@/features/sessao/dal";

export const metadata: Metadata = { title: "Demonstrações · LicCONT" };

const entrada = "!min-h-10 !rounded-lg !text-sm";
const FILTROS = [
  ["novo", "Novos"],
  ["contato", "Contato"],
  ["agendado", "Agendados"],
  ["feito", "Feitos"],
] as const;
const TOM = { novo: "aviso", contato: "aviso", agendado: "ok", feito: "ok", descartado: "erro" } as const;
const rotuloMini = "text-[11px] font-medium tracking-[.05em] text-texto-suave uppercase";

// Pedidos de demonstração do site (quadro EquipeDemos). Contato é dado pessoal: só a equipe vê,
// nada vai para log, e a auditoria guarda só o código do pedido e a situação.
export default async function Demonstracoes({ searchParams }: { searchParams: Promise<{ situacao?: string; sel?: string }> }) {
  await exigirEquipe();
  const busca = await searchParams;
  const todos = await listarPedidos(200);
  const n = (s: SituacaoPedido) => todos.filter((p) => p.situacao === s).length;
  const filtro = FILTROS.find(([v]) => v === busca.situacao)?.[0] ?? null;
  const lista = todos.filter((p) => (filtro ? p.situacao === filtro : p.situacao !== "descartado"));
  const sel = todos.find((p) => p.id === busca.sel) ?? lista[0] ?? null;
  const href = (s: string | null, id?: string) => `/equipe/demonstracoes?${new URLSearchParams({ ...(s && { situacao: s }), ...(id && { sel: id }) })}`;

  return (
    <PaginaEquipe titulo="Pedidos de demonstração">
      <div className="grid min-h-0 gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Painel className="pb-1.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <TituloPainel>Pedidos do site</TituloPainel>
              <p className="text-[12.5px] text-texto-suave">Formulário Pedir demonstração</p>
            </div>
            <Filtros itens={FILTROS.map(([v, r]) => ({ href: href(v), rotulo: `${r} · ${n(v)}`, ativo: filtro === v }))} />
          </div>
          <div className="-mx-5 -mb-1.5 overflow-x-auto">
            <table className="w-full text-left">
              <caption className="sr-only">Pedidos de demonstração</caption>
              <thead>
                <tr className={linhaCabecalho}>
                  <th scope="col" className={th}>Órgão</th>
                  <th scope="col" className={th}>Situação</th>
                  <th scope="col" className={th}>Recebido</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((p, i) => (
                  <tr key={p.id} className={classeLinha(p.id === sel?.id, i % 2 === 1)}>
                    <td className={`${td} w-full`}>
                      <Link href={href(filtro, p.id)} aria-current={p.id === sel?.id ? "true" : undefined} className="block focus-visible:outline-2 focus-visible:outline-foco">
                        <span className="block font-semibold">{p.orgao}</span>
                        <span className="block text-[12.5px] text-texto-suave">{p.cargo ?? "—"}</span>
                      </Link>
                    </td>
                    <td className={td}><Pilula tom={TOM[p.situacao]}>{SITUACOES_PEDIDO[p.situacao]}</Pilula></td>
                    <td className={`${td} text-[13px]`}>{haTempo(p.criadoEm)}</td>
                  </tr>
                ))}
                {lista.length === 0 && <tr><td colSpan={3} className="px-4 py-6 text-center text-sm text-texto-suave">Nenhum pedido aqui.</td></tr>}
              </tbody>
            </table>
          </div>
        </Painel>

        {sel && (
          <Painel className="self-start">
            <div>
              <div className="text-xs text-texto-suave">Recebido {haTempo(sel.criadoEm)}, {formatarDiaHora(sel.criadoEm)}</div>
              <h2 className="mt-0.5 font-titulo text-[19px] leading-6 font-bold">{sel.orgao}</h2>
            </div>
            <dl className="flex flex-col gap-2.5 text-[13.5px]">
              {([["Nome", sel.nome], ["Cargo", sel.cargo], ["E-mail", sel.email], ["Telefone", sel.telefone], ["Mensagem", sel.mensagem]] as const).map(([r, v]) => (
                <div key={r}><dt className="text-texto-suave">{r}</dt><dd className="font-medium break-words">{v || "—"}</dd></div>
              ))}
            </dl>
            <div className="h-px bg-linha" />
            <span className={rotuloMini}>Andamento</span>
            <Formulario key={sel.id} acao={atualizarPedido} botao="Salvar" enviando="Salvando…" className="gap-3.5">
              <input type="hidden" name="id" value={sel.id} />
              <Selecao rotulo="Situação" name="situacao" defaultValue={sel.situacao} className={entrada}>
                {Object.entries(SITUACOES_PEDIDO).map(([v, r]) => <option key={v} value={v}>{r}</option>)}
              </Selecao>
              <Campo rotulo="Data da demonstração" name="demo_em" type="date" defaultValue={sel.demoEm ?? ""} className={entrada} />
              <Campo rotulo="Responsável" name="responsavel" maxLength={80} defaultValue={sel.responsavel ?? ""} className={entrada} />
            </Formulario>
            <div className="flex flex-wrap gap-2.5">
              <Link href={`/equipe/nova?pedido=${sel.id}`} className={`${botaoPrimario} flex-1`}>Criar prefeitura a partir do pedido</Link>
              {sel.situacao !== "descartado" && (
                <Formulario key={`d-${sel.id}`} acao={atualizarPedido} botao="Descartar" enviando="Descartando…" variante="secundario">
                  <input type="hidden" name="id" value={sel.id} />
                  <input type="hidden" name="situacao" value="descartado" />
                  <input type="hidden" name="demo_em" value={sel.demoEm ?? ""} />
                  <input type="hidden" name="responsavel" value={sel.responsavel ?? ""} />
                </Formulario>
              )}
            </div>
          </Painel>
        )}
      </div>
      <p className="text-[12.5px] text-texto-suave">Dados de contato são pessoais: só a equipe vê, só para responder ao pedido.</p>
    </PaginaEquipe>
  );
}
