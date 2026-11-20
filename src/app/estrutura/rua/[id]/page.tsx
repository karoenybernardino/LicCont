import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Formulario } from "@/ui/formulario";
import { Selecao } from "@/ui/selecao";
import { exigirSessao } from "@/features/sessao/dal";
import { PaginaSistema } from "@/features/sessao/pagina";
import { idSchema } from "@/features/login/esquemas";
import { adicionarCaixas, alterarCapacidade, alterarSituacao } from "@/features/estrutura/acoes";
import { caixasDoNivel, carregarEstrutura, galpaoDaRua, podeCaixas } from "@/features/estrutura/dados";
import { LIMITES } from "@/features/estrutura/esquemas";
import { codigoPosicao, numeroBR, percentual, resumir } from "@/features/estrutura/ocupacao";
import { BotaoAcao } from "@/features/estrutura/botao-acao";
import { LegendaFrente, VistaFrente } from "@/features/estrutura/vista-frente";
import { detalheDaCaixa, idDaCaixaPorPosicao } from "@/features/mapa/dados";
import { ORGAOS } from "@/features/documentos/tipos";
import { Pilula } from "@/ui/canvas";
import {
  BarraOcupacao,
  Painel,
  Rotulo,
  TituloPainel,
  botaoPequeno,
  classeLinha,
  linhaCabecalho,
  td,
  th,
} from "@/features/estrutura/componentes";

export const metadata: Metadata = { title: "Rua · Estrutura física · LicCONT" };

const opcoes = (de: number, ate: number) => Array.from({ length: Math.max(ate - de + 1, 0) }, (_, i) => de + i);

export default async function RuaDoGalpao({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ nivel?: string; caixa?: string }>;
}) {
  const { usuario, secretaria } = await exigirSessao();
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();
  const galpaoId = await galpaoDaRua(id);
  if (!galpaoId) notFound();
  const e = await carregarEstrutura(galpaoId);
  const rua = e.ruas.find((r) => r.id === id);
  if (!rua) notFound();

  const admin = usuario.administrador;
  const editaCaixas = await podeCaixas(usuario);
  const { nivel: nivelBuscado, caixa: caixaBuscada } = await searchParams;
  const modulos = e.modulos.filter((m) => m.ruaId === rua.id);
  const niveisDaRua = e.niveis.filter((n) => modulos.some((m) => m.id === n.moduloId));
  const nivel = niveisDaRua.find((n) => n.id === nivelBuscado);
  const moduloDoNivel = nivel && modulos.find((m) => m.id === nivel.moduloId);
  const caixas = nivel ? await caixasDoNivel(nivel.id) : [];
  const resumo = resumir(e, rua.id);
  const ativosDaRua = modulos.filter((m) => m.ativo);
  const niveisPorModulo = Math.max(0, ...ativosDaRua.map((m) => niveisDaRua.filter((n) => n.moduloId === m.id && n.ativo).length));
  const ocupacaoModulos = ativosDaRua.map((m) => {
    const ns = niveisDaRua.filter((n) => n.moduloId === m.id && n.ativo);
    const cx = ns.reduce((t, n) => t + n.caixas, 0);
    return { id: m.id, numero: m.numero, caixas: cx, percentual: percentual(cx, ns.reduce((t, n) => t + n.capacidade, 0)) };
  });
  const numeroCaixa = Number(caixaBuscada);
  const caixaId = nivel && Number.isInteger(numeroCaixa) && numeroCaixa >= 1 && numeroCaixa <= 200 ? await idDaCaixaPorPosicao(nivel.id, numeroCaixa) : null;
  const detalhe = caixaId ? await detalheDaCaixa(usuario, caixaId) : null;
  const caixasPorNivel = new Map(await Promise.all(niveisDaRua.map(async (n) => [n.id, await caixasDoNivel(n.id)] as const)));

  return (
    <PaginaSistema
      usuario={usuario}
      secretaria={secretaria}
      titulo={`Rua ${rua.codigo}`}
      trilha={`Estrutura física · ${e.galpao?.nome ?? "Galpão"}`}
      larga
      acoes={
        <div className="flex flex-wrap gap-2">
          <Link href={`/mapa?galpao=${galpaoId}`} className={botaoPequeno}>
            Voltar ao mapa
          </Link>
          <Link href={`/mapa?galpao=${galpaoId}&codigos=${Array.from(caixasPorNivel.entries()).flatMap(([nid, ns]) => { const n = niveisDaRua.find((x) => x.id === nid); const m = modulos.find((x) => x.id === n?.moduloId); return m && n ? ns.slice(0, 1).map((c) => codigoPosicao(rua.codigo, m.numero, n.numero, c)) : []; }).slice(0, 50).join(",")}&vista=corredor`} className={botaoPequeno}>
            Ver no mapa 3D
          </Link>
          <Link href={`/estrutura?galpao=${galpaoId}&rua=${rua.id}`} className={botaoPequeno}>
            Voltar para a estrutura
          </Link>
        </div>
      }
    >
      <Painel>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <span aria-hidden className="flex size-[52px] items-center justify-center rounded-[14px] bg-[linear-gradient(145deg,#5eead4,#0e7490)] font-mono text-[22px] font-medium text-white">
              {rua.codigo}
            </span>
            <div>
              <div className="font-titulo text-xl font-bold">Rua {rua.codigo}</div>
              <div className="text-[13px] text-texto-suave">{e.galpao?.nome ?? "Galpão"}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-4">
            <Dado rotulo="Módulos" valor={resumo.modulos} />
            <Dado rotulo="Níveis" valor={niveisPorModulo} />
            <Dado rotulo="Caixas" valor={`${numeroBR(resumo.caixas)} de ${numeroBR(resumo.capacidade)}`} />
            <div className="flex min-w-40 flex-col gap-1">
              <Rotulo>Ocupação</Rotulo>
              <BarraOcupacao percentual={resumo.percentual} />
            </div>
          </div>
          {admin && (
            <BotaoAcao
              acao={alterarSituacao}
              botao={rua.ativo ? "Desativar rua" : "Reativar rua"}
              campos={{ tabela: "ruas", id: rua.id, ativo: rua.ativo ? "nao" : "sim" }}
            />
          )}
        </div>
        {!rua.ativo && <p className="text-sm text-texto-suave">Esta rua está desativada.</p>}
      </Painel>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_330px]">
        <div className="flex min-w-0 flex-col gap-4">
          <Painel>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Rotulo>Vista de frente · clique numa caixa</Rotulo>
              <div role="group" aria-label="Vista" className="inline-flex gap-[3px] rounded-[13px] border border-linha bg-superficie p-[3px] text-[13px]">
                <span aria-current="true" className="flex min-h-[34px] items-center rounded-[10px] border-2 border-[#0e7490] bg-[rgba(45,212,191,.18)] px-4 font-semibold dark:border-[#2dd4bf]">Frente</span>
                <Link href={`/mapa?galpao=${galpaoId}&vista=planta`} className="flex min-h-[34px] items-center rounded-[10px] border-2 border-transparent px-4 hover:bg-superficie-2">Planta</Link>
                <Link href={`/mapa?galpao=${galpaoId}&vista=3d`} className="flex min-h-[34px] items-center rounded-[10px] border-2 border-transparent px-4 hover:bg-superficie-2">3D</Link>
              </div>
            </div>
            <div className="rounded-xl border border-linha bg-white/40 px-2.5 pt-3.5 pb-2 dark:bg-white/[.02]">
              <VistaFrente rua={rua.codigo} ruaId={rua.id} modulos={modulos} niveis={niveisDaRua} caixas={caixasPorNivel} selecionado={nivel?.id} caixaSelecionada={detalhe ? numeroCaixa : undefined} />
            </div>
            <LegendaFrente />
          </Painel>

          <Painel>
            <Rotulo>Ocupação por módulo</Rotulo>
            <ul className="flex flex-col">
              {ocupacaoModulos.map((m, i) => (
                <li key={m.id} className={`grid grid-cols-[2.5rem_minmax(0,1fr)_7rem] items-center gap-3 px-1 py-2 text-[13px] ${i % 2 === 0 ? "" : "bg-[rgba(14,116,144,.035)]"}`}>
                  <span className="font-mono">M{m.numero}</span>
                  <BarraOcupacao percentual={m.percentual} />
                  <span className="text-right text-texto-suave">{m.caixas} caixas</span>
                </li>
              ))}
            </ul>
          </Painel>
        </div>

        <aside aria-label="Caixa selecionada" id="caixa" className="min-w-0">
          <Painel>
            <div className="flex items-center justify-between gap-2">
              <Rotulo>Caixa selecionada</Rotulo>
              {detalhe && <Pilula tom="aviso">Selecionada</Pilula>}
            </div>
            {!detalhe ? (
              <p className="text-sm text-texto-suave">Clique numa caixa na vista de frente para ver os documentos dela.</p>
            ) : (
              <>
                <p className="font-mono text-base leading-6 font-medium">
                  Rua {detalhe.rua} · Módulo {detalhe.modulo} · Nível {detalhe.nivel} · Caixa {String(detalhe.caixa).padStart(2, "0")}
                </p>
                <p className="text-[13px]">
                  <b className="font-semibold">{detalhe.total}</b> {detalhe.total === 1 ? "documento nesta caixa" : "documentos nesta caixa"}
                </p>
                {detalhe.documentos.length === 0 ? (
                  <p className="text-sm text-texto-suave">{detalhe.total === 0 ? "Caixa vazia." : "Nenhum documento desta caixa é da sua secretaria."}</p>
                ) : (
                  <ul className="flex flex-col gap-1.5" aria-label="Documentos da caixa">
                    {detalhe.documentos.map((d) => (
                      <li key={d.id}>
                        <Link href={`/documentos/${d.id}`} className="flex items-center gap-2 rounded-[10px] border border-linha bg-superficie-2 px-2.5 py-2 hover:border-destaque focus-visible:outline-2 focus-visible:outline-foco">
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-titulo text-[13px] font-semibold">{d.titulo}</span>
                            <span className="block truncate text-[11px] text-texto-suave">{[d.tituloProcesso, d.secretaria, d.ano].filter(Boolean).join(" · ")}</span>
                          </span>
                          {d.orgao === "camara" && <Pilula tom="aviso">{ORGAOS.camara}</Pilula>}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                <Link href={`/mapa?galpao=${galpaoId}&caixa=${detalhe.id}`} className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[linear-gradient(135deg,#0e7490,#0f766e)] px-5 text-sm font-semibold text-white dark:bg-none dark:bg-[#2dd4bf] dark:text-[#0b2e3a]">
                  Ver no mapa 3D
                </Link>
                <Link href={`/etiquetas?caixas=${detalhe.id}`} className="inline-flex min-h-11 items-center justify-center rounded-lg border border-linha px-5 text-sm font-medium hover:border-destaque">
                  Imprimir etiqueta
                </Link>
              </>
            )}
          </Painel>
        </aside>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Painel>
          <TituloPainel>Módulos e níveis</TituloPainel>
          {modulos.length === 0 ? (
            <p className="text-sm text-texto-suave">
              Nenhum módulo. {admin ? "Use “Adicionar módulos” na tela da estrutura." : ""}
            </p>
          ) : (
            <div className="-mx-5 overflow-auto">
              <table className="w-full min-w-[560px] border-collapse">
                <thead>
                  <tr className={linhaCabecalho}>
                    <th scope="col" className={th}>Posição</th>
                    <th scope="col" className={th}>Caixas</th>
                    <th scope="col" className={`${th} w-[34%]`}>Ocupação</th>
                    <th scope="col" className={th}><span className="sr-only">Ações</span></th>
                  </tr>
                </thead>
                {modulos.map((m) => {
                  const niveis = e.niveis.filter((n) => n.moduloId === m.id).sort((a, b) => b.numero - a.numero);
                  return (
                    <tbody key={m.id}>
                      <tr className="border-b border-linha">
                        <th scope="rowgroup" colSpan={3} className="px-4 py-2 text-left font-titulo text-[13px] font-semibold">
                          Módulo {m.numero}
                          {!m.ativo && <span className="ml-1 font-sans text-xs font-normal text-texto-suave">(desativado)</span>}
                        </th>
                        <td className="px-4 py-2 text-right">
                          {admin && (
                            <BotaoAcao
                              acao={alterarSituacao}
                              botao={m.ativo ? "Desativar" : "Reativar"}
                              rotulo={`${m.ativo ? "Desativar" : "Reativar"} Módulo ${m.numero}`}
                              campos={{ tabela: "modulos", id: m.id, ativo: m.ativo ? "nao" : "sim" }}
                            />
                          )}
                        </td>
                      </tr>
                      {niveis.map((n, i) => (
                        <tr key={n.id} className={classeLinha(n.id === nivel?.id, i % 2 === 0)}>
                          <th scope="row" className={`${td} text-left font-normal`}>
                            Nível {n.numero}
                            <span className="ml-2 font-mono text-xs text-texto-suave">{codigoPosicao(rua.codigo, m.numero, n.numero)}</span>
                            {!n.ativo && <span className="ml-1 text-xs text-texto-suave">(desativado)</span>}
                          </th>
                          <td className={td}>
                            {n.caixas} de {n.capacidade}
                          </td>
                          <td className={td}>
                            <BarraOcupacao percentual={percentual(n.caixas, n.capacidade)} />
                          </td>
                          <td className={`${td} text-right`}>
                            <Link
                              href={`/estrutura/rua/${rua.id}?nivel=${n.id}#nivel`}
                              aria-label={`${admin || editaCaixas ? "Gerenciar" : "Ver"} Módulo ${m.numero} · Nível ${n.numero}`}
                              className={botaoPequeno}
                            >
                              {admin || editaCaixas ? "Gerenciar" : "Ver"}
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  );
                })}
              </table>
            </div>
          )}
        </Painel>

        <Painel>
          <h2 id="nivel" className="text-[17px] font-bold">
            {nivel && moduloDoNivel ? `Módulo ${moduloDoNivel.numero} · Nível ${nivel.numero}` : "Nível"}
          </h2>
          {!nivel || !moduloDoNivel ? (
            <p className="text-sm text-texto-suave">Escolha um nível na lista para ver as caixas.</p>
          ) : (
            <div className="flex flex-col gap-5">
              <p className="text-sm text-texto-suave">
                <span className="font-mono">{codigoPosicao(rua.codigo, moduloDoNivel.numero, nivel.numero)}</span> ·{" "}
                {nivel.caixas} de {nivel.capacidade} posições ocupadas
                {!nivel.ativo && " · desativado"}
              </p>

              {caixas.length > 0 && (
                <div className="flex flex-col gap-2">
                  <Rotulo>Caixas</Rotulo>
                  <ul className="flex flex-wrap gap-1.5">
                    {caixas.map((c) => (
                      <li key={c} className="rounded-md border border-linha px-2 py-0.5 font-mono text-xs">
                        {codigoPosicao(rua.codigo, moduloDoNivel.numero, nivel.numero, c)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {editaCaixas && nivel.caixas < nivel.capacidade && nivel.ativo && (
                <Formulario acao={adicionarCaixas} botao="Cadastrar caixas" enviando="Cadastrando…">
                  <input type="hidden" name="nivel" value={nivel.id} />
                  <Selecao rotulo="Quantidade de caixas" name="quantidade" defaultValue="1">
                    {opcoes(1, Math.min(nivel.capacidade - nivel.caixas, LIMITES.caixasPorVez)).map((q) => (
                      <option key={q}>{q}</option>
                    ))}
                  </Selecao>
                </Formulario>
              )}

              {editaCaixas && nivel.ativo && nivel.caixas >= nivel.capacidade && (
                <p role="status" className="text-sm text-texto-suave">
                  Nível cheio: não há posição livre.
                </p>
              )}

              {editaCaixas && caixas.length > 0 && (
                <Formulario acao={alterarSituacao} botao="Desativar caixa" enviando="Salvando…" variante="secundario">
                  <input type="hidden" name="tabela" value="caixas" />
                  <input type="hidden" name="id" value={nivel.id} />
                  <input type="hidden" name="ativo" value="nao" />
                  <Selecao rotulo="Caixa a desativar" name="numero" defaultValue={String(caixas.at(-1))}>
                    {caixas.map((c) => (
                      <option key={c} value={c}>
                        {codigoPosicao(rua.codigo, moduloDoNivel.numero, nivel.numero, c)}
                      </option>
                    ))}
                  </Selecao>
                </Formulario>
              )}

              {admin && (
                <Formulario acao={alterarCapacidade} botao="Salvar capacidade" enviando="Salvando…" variante="secundario">
                  <input type="hidden" name="id" value={nivel.id} />
                  <Selecao rotulo="Capacidade (caixas)" name="capacidade" defaultValue={String(nivel.capacidade)}>
                    {opcoes(Math.max(1, caixas.at(-1) ?? 1), LIMITES.capacidade).map((q) => (
                      <option key={q}>{q}</option>
                    ))}
                  </Selecao>
                </Formulario>
              )}

              {admin && (
                <BotaoAcao
                  acao={alterarSituacao}
                  botao={nivel.ativo ? "Desativar nível" : "Reativar nível"}
                  campos={{ tabela: "niveis", id: nivel.id, ativo: nivel.ativo ? "nao" : "sim" }}
                />
              )}
            </div>
          )}
        </Painel>
      </div>
    </PaginaSistema>
  );
}

function Dado({ rotulo, valor }: { rotulo: string; valor: string | number }) {
  return (
    <div className="flex flex-col gap-1">
      <Rotulo>{rotulo}</Rotulo>
      <span className="font-titulo text-lg font-bold">{valor}</span>
    </div>
  );
}
