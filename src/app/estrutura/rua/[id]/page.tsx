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
  searchParams: Promise<{ nivel?: string }>;
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
  const { nivel: nivelBuscado } = await searchParams;
  const modulos = e.modulos.filter((m) => m.ruaId === rua.id);
  const niveisDaRua = e.niveis.filter((n) => modulos.some((m) => m.id === n.moduloId));
  const nivel = niveisDaRua.find((n) => n.id === nivelBuscado);
  const moduloDoNivel = nivel && modulos.find((m) => m.id === nivel.moduloId);
  const caixas = nivel ? await caixasDoNivel(nivel.id) : [];
  const resumo = resumir(e, rua.id);

  return (
    <PaginaSistema
      usuario={usuario}
      secretaria={secretaria}
      titulo={`Rua ${rua.codigo}`}
      trilha={`Estrutura física · ${e.galpao?.nome ?? "Galpão"}`}
      larga
      acoes={
        <Link href={`/estrutura?galpao=${galpaoId}&rua=${rua.id}`} className={botaoPequeno}>
          Voltar para a estrutura
        </Link>
      }
    >
      <Painel>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-4">
            <Dado rotulo="Módulos" valor={resumo.modulos} />
            <Dado rotulo="Níveis" valor={resumo.niveis} />
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
