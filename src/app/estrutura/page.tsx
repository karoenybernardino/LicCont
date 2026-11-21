import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { Campo } from "@/ui/campo";
import { Formulario } from "@/ui/formulario";
import { Selecao } from "@/ui/selecao";
import { exigirSessao } from "@/features/sessao/dal";
import { PaginaSistema } from "@/features/sessao/pagina";
import { idSchema } from "@/features/login/esquemas";
import { adicionarModulos, cadastrarGalpao, cadastrarRua } from "@/features/estrutura/acoes";
import { carregarEstrutura, lerCaixasPorModulo, podeCaixas, ultimasAlteracoes } from "@/features/estrutura/dados";
import { quando } from "@/features/estrutura/alteracoes";
import { LIMITES } from "@/features/estrutura/esquemas";
import { CAIXAS_POR_NIVEL, niveisPorModulo } from "@/features/estrutura/capacidade";
import { media, numeroBR, resumir } from "@/features/estrutura/ocupacao";
import { BotaoAcao } from "@/features/estrutura/botao-acao";
import {
  BarraOcupacao,
  CartaoNumero,
  Etiqueta,
  Painel,
  Rotulo,
  TituloPainel,
  botaoPequeno,
  classeLinha,
  linhaCabecalho,
  td,
  th,
} from "@/features/estrutura/componentes";

export const metadata: Metadata = { title: "Estrutura física · LicCONT" };

const id = (valor: string | undefined) => (idSchema.safeParse(valor).success ? valor : undefined);
const opcoes = (ate: number) => Array.from({ length: ate }, (_, i) => i + 1);

// Acumulado rua a rua, para a linha dos cartões.
const acumular = (valores: number[]) => valores.map((_, i) => valores.slice(0, i + 1).reduce((s, v) => s + v, 0));

export default async function EstruturaFisica({
  searchParams,
}: {
  searchParams: Promise<{ galpao?: string; rua?: string; modulo?: string }>;
}) {
  const { usuario, secretaria } = await exigirSessao();
  const busca = await searchParams;
  const e = await carregarEstrutura(id(busca.galpao));
  const admin = usuario.administrador;
  const editaCaixas = await podeCaixas(usuario);
  const caixasPorModulo = await lerCaixasPorModulo();
  const alteracoes = admin && e.galpao ? await ultimasAlteracoes(e) : [];

  const ruasAtivas = e.ruas.filter((r) => r.ativo);
  const rua = e.ruas.find((r) => r.id === busca.rua) ?? ruasAtivas[0] ?? e.ruas[0];
  const modulosDaRua = rua ? e.modulos.filter((m) => m.ruaId === rua.id) : [];
  const modulo = modulosDaRua.find((m) => m.id === busca.modulo) ?? modulosDaRua[0];
  const total = resumir(e);
  const porRua = ruasAtivas.map((r) => resumir(e, r.id));
  const link = (params: Record<string, string | undefined>) =>
    `/estrutura?${new URLSearchParams({ galpao: e.galpao?.id ?? "", ...Object.fromEntries(Object.entries(params).filter(([, v]) => v)) })}`;

  const novoGalpao = admin && (
    <details className="relative">
      <summary className={`${botaoPequeno} cursor-pointer list-none`}>Novo galpão</summary>
      <Painel className="absolute right-0 z-10 mt-2 w-80">
        <Formulario acao={cadastrarGalpao} botao="Cadastrar galpão" enviando="Cadastrando…">
          <Campo rotulo="Nome do galpão" name="nome" required minLength={3} maxLength={80} />
        </Formulario>
      </Painel>
    </details>
  );

  const seletorGalpao = e.galpoes.length > 1 && (
    <form method="get" action="/estrutura" className="flex items-end gap-2">
      <Selecao rotulo="Galpão" name="galpao" defaultValue={e.galpao?.id}>
        {e.galpoes.map((g) => (
          <option key={g.id} value={g.id}>
            {g.nome}
            {g.ativo ? "" : " (desativado)"}
          </option>
        ))}
      </Selecao>
      <button type="submit" className={`${botaoPequeno} mb-2`}>
        Ver
      </button>
    </form>
  );

  return (
    <PaginaSistema
      usuario={usuario}
      secretaria={secretaria}
      titulo="Estrutura física"
      trilha={`Acervo · ${e.galpao?.nome ?? "Galpão"}`}
      larga
      acoes={
        <div className="flex flex-wrap items-end gap-3">
          {seletorGalpao}
          {novoGalpao}
        </div>
      }
    >
      {!e.galpao ? (
        <Painel>
          <TituloPainel>Nenhum galpão cadastrado</TituloPainel>
          <p className="text-sm text-texto-suave">
            {admin
              ? "Cadastre o primeiro galpão em “Novo galpão”. Depois, crie as ruas e adicione os módulos."
              : "O administrador da prefeitura ainda não cadastrou a estrutura física."}
          </p>
        </Painel>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <CartaoNumero
              rotulo="Ruas"
              valor={numeroBR(ruasAtivas.length)}
              legenda={ruasAtivas.length ? `Rua ${ruasAtivas[0].codigo} a Rua ${ruasAtivas.at(-1)!.codigo}` : "Nenhuma rua"}
              cor="teal"
              icone="pasta"
              serie={acumular(ruasAtivas.map(() => 1))}
            />
            <CartaoNumero
              rotulo="Módulos"
              valor={numeroBR(total.modulos)}
              legenda={`${media(total.modulos, ruasAtivas.length)} por rua`}
              cor="aco"
              icone="folha"
              serie={acumular(porRua.map((r) => r.modulos))}
            />
            <CartaoNumero
              rotulo="Níveis"
              valor={numeroBR(total.niveis)}
              legenda={`${media(total.niveis, total.modulos)} por módulo`}
              cor="ambar"
              icone="sol"
              serie={acumular(porRua.map((r) => r.niveis))}
            />
            <CartaoNumero
              rotulo="Posições"
              valor={numeroBR(total.caixas)}
              legenda={`caixas de ${numeroBR(total.capacidade)} posições · ${total.percentual}%`}
              cor="vermelho"
              icone="caixa"
              serie={acumular(porRua.map((r) => r.caixas))}
            />
          </div>

          <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-[1.5fr_1fr]">
            <div className="flex min-w-0 flex-col gap-4">
              <Painel className="flex-1">
                <div className="flex items-start justify-between gap-3">
                  <TituloPainel>Ruas do galpão</TituloPainel>
                  {admin && (
                    <BotaoAcao acao={cadastrarRua} botao="Nova rua" campos={{ galpao: e.galpao.id }} principal />
                  )}
                </div>
                <div className="-mx-5 max-h-[250px] overflow-auto">
                  {e.ruas.length === 0 ? (
                    <p className="px-5 text-sm text-texto-suave">Nenhuma rua neste galpão.</p>
                  ) : (
                    <table className="w-full min-w-[560px] border-collapse">
                      <thead>
                        <tr className={linhaCabecalho}>
                          <th scope="col" className={th}>Rua</th>
                          <th scope="col" className={th}>Módulos</th>
                          <th scope="col" className={th}>Níveis</th>
                          <th scope="col" className={th}>Caixas</th>
                          <th scope="col" className={`${th} w-[30%]`}>Ocupação</th>
                          <th scope="col" className={th}><span className="sr-only">Ações</span></th>
                        </tr>
                      </thead>
                      <tbody>
                        {e.ruas.map((r, i) => {
                          const s = resumir(e, r.id);
                          const atual = r.id === rua?.id;
                          return (
                            <tr key={r.id} className={classeLinha(atual, i % 2 === 0)}>
                              <th scope="row" className={`${td} text-left font-normal`}>
                                <Link
                                  href={link({ rua: r.id })}
                                  aria-current={atual ? "true" : undefined}
                                  className="underline-offset-2 hover:underline"
                                >
                                  Rua {r.codigo}
                                </Link>
                                {!r.ativo && <span className="ml-1 text-xs text-texto-suave">(desativada)</span>}
                              </th>
                              <td className={td}>{s.modulos}</td>
                              <td className={td}>{s.niveis}</td>
                              <td className={td}>{numeroBR(s.caixas)}</td>
                              <td className={td}>
                                <BarraOcupacao percentual={s.percentual} />
                              </td>
                              <td className={`${td} text-right`}>
                                <Link href={`/estrutura/rua/${r.id}`} className={botaoPequeno} aria-label={`${admin || editaCaixas ? "Editar" : "Ver"} Rua ${r.codigo}`}>
                                  {admin || editaCaixas ? "Editar" : "Ver"}
                                </Link>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </Painel>

              {admin && (
                <Painel className="flex-1">
                  <TituloPainel>Últimas alterações</TituloPainel>
                  <div tabIndex={0} role="region" aria-label="Últimas alterações" className="-mx-5 max-h-[200px] overflow-auto focus-visible:outline-2 focus-visible:outline-foco">
                    {alteracoes.length === 0 ? (
                      <p className="px-5 text-sm text-texto-suave">Nenhuma alteração registrada.</p>
                    ) : (
                      <ul>
                        {alteracoes.map((a, i) => (
                          <li
                            key={i}
                            className={`grid h-[50px] grid-cols-[1fr_110px] items-center gap-3 px-4 ${classeLinha(false, i % 2 === 0)}`}
                          >
                            <div className="min-w-0">
                              <p className="truncate font-titulo text-[13px] font-semibold">{a.titulo}</p>
                              <p className="truncate text-xs text-texto-suave">
                                {[a.detalhe, quando(a.quando)].filter(Boolean).join(" · ")}
                              </p>
                            </div>
                            <span>
                              <Etiqueta>{a.tipo}</Etiqueta>
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </Painel>
              )}
            </div>

            <div className="flex min-w-0 flex-col gap-4">
              <Painel className="flex-1">
                <Rotulo id="titulo-arvore">{rua ? `Estrutura da Rua ${rua.codigo}` : "Estrutura da rua"}</Rotulo>
                {rua && (
                  <nav aria-labelledby="titulo-arvore" className="max-h-[250px] overflow-auto pr-1.5">
                    <ul className="flex flex-col gap-0.5 text-[13px]">
                      <li>
                        <Item nivel={0} marcador="▾" ativo>
                          Rua {rua.codigo}
                        </Item>
                      </li>
                      {modulosDaRua.map((m) => {
                        const aberto = m.id === modulo?.id;
                        const niveis = e.niveis.filter((n) => n.moduloId === m.id).sort((a, b) => b.numero - a.numero);
                        return (
                          <li key={m.id}>
                            <Link
                              href={link({ rua: rua.id, modulo: m.id })}
                              aria-current={aberto ? "true" : undefined}
                              aria-expanded={aberto}
                              className="block rounded-lg focus-visible:outline-2 focus-visible:outline-foco"
                            >
                              <Item nivel={1} marcador={aberto ? "▾" : "▸"} ativo={aberto}>
                                Módulo {m.numero}
                                {!m.ativo && " (desativado)"}
                              </Item>
                            </Link>
                            {aberto && (
                              <ul>
                                {niveis.map((n) => (
                                  <li key={n.id}>
                                    <Item nivel={2} marcador="•" suave>
                                      Nível {n.numero} · {n.caixas} {n.caixas === 1 ? "caixa" : "caixas"} de {n.capacidade}
                                      {!n.ativo && " (desativado)"}
                                    </Item>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </nav>
                )}
              </Painel>

              {admin && ruasAtivas.length > 0 && (
                <Painel>
                  <TituloPainel>Adicionar módulos</TituloPainel>
                  <Formulario
                    acao={adicionarModulos}
                    botao="Adicionar ao galpão"
                    enviando="Adicionando…"
                    nota="O mapa 3D (menu Mapa 3D) e as etiquetas são gerados a partir desta estrutura."
                  >
                    <div className="grid grid-cols-2 gap-3">
                      <Selecao rotulo="Rua" name="rua" defaultValue={rua?.ativo ? rua.id : ruasAtivas[0].id}>
                        {ruasAtivas.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.codigo}
                          </option>
                        ))}
                      </Selecao>
                      <Selecao rotulo="Módulos" name="modulos" defaultValue="2">
                        {opcoes(LIMITES.modulos).map((n) => (
                          <option key={n}>{n}</option>
                        ))}
                      </Selecao>
                      <p className="self-end text-[12.5px] text-texto-suave sm:col-span-2">
                        Cada módulo tem {niveisPorModulo(caixasPorModulo)} níveis de {CAIXAS_POR_NIVEL} caixas ({caixasPorModulo} caixas por módulo).
                      </p>
                    </div>
                  </Formulario>
                </Painel>
              )}
            </div>
          </div>
        </>
      )}
    </PaginaSistema>
  );
}

function Item({
  nivel,
  marcador,
  ativo = false,
  suave = false,
  children,
}: {
  nivel: 0 | 1 | 2;
  marcador: string;
  ativo?: boolean;
  suave?: boolean;
  children: ReactNode;
}) {
  const recuo = ["grid-cols-[22px_16px_1fr]", "grid-cols-[44px_16px_1fr]", "grid-cols-[66px_16px_1fr]"][nivel];
  return (
    <span
      className={`grid h-[34px] items-center rounded-lg px-2.5 ${recuo} ${ativo ? "bg-[rgba(45,212,191,.18)]" : "hover:bg-[rgba(14,116,144,.06)]"} ${suave ? "text-texto-suave" : ""}`}
    >
      <span />
      <span aria-hidden className={`text-center text-xs ${ativo ? "text-[#2dd4bf]" : "text-texto-suave"}`}>
        {marcador}
      </span>
      <span className="whitespace-nowrap">{children}</span>
    </span>
  );
}
