import type { Metadata } from "next";
import { MODULOS } from "@/features/modulos/ocultos";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Formulario } from "@/ui/formulario";
import { Campo } from "@/ui/campo";
import { Selecao } from "@/ui/selecao";
import { BotaoEnviar } from "@/ui/botao-enviar";
import { CabecalhoPainel, Filtros, Pilula, botaoContorno, botaoPrimario } from "@/ui/canvas";
import { BotaoConfirmar } from "@/features/equipe/botao-confirmar";
import { PaginaEquipe } from "@/features/equipe/pagina";
import { Painel, classeLinha, linhaCabecalho, td, th } from "@/features/estrutura/componentes";
import { importarPelaEquipe } from "@/features/equipe/acoes";
import { acoesEquipe, integracoes } from "@/features/equipe/dados";
import { AVISOS_IMPORTAR, formatarGb, formatarReais, quando, textoAcao } from "@/features/equipe/textos";
import { idSchema } from "@/features/login/esquemas";
import { atualizarPrefeitura, convidarAdmin, mudarStatus, removerAdmin } from "@/features/prefeituras/acoes";
import { listarAdministradores, obterPrefeitura, suporteAutorizadoAte, usoPrefeituras, type UsoPrefeitura } from "@/features/prefeituras/dados";
import { formatarCnpj } from "@/features/prefeituras/lista";
import { formatarData } from "@/features/documentos/formato";
import { exigirEquipe } from "@/features/sessao/dal";
import { listarParceiras, marcaDoOrgao } from "@/features/equipe/marca";
import { AbaSecretarias } from "@/features/equipe/aba-secretarias";
import { AbaUsuarios } from "@/features/equipe/aba-usuarios";
import { FormMarca } from "@/features/equipe/marca-form";

export const metadata: Metadata = { title: "Prefeitura · LicCONT" };

const SITUACOES = { implantacao: "Em implantação", ativa: "Ativa", suspensa: "Suspensa" } as const;
const TONS = { implantacao: "aviso", ativa: "ok", suspensa: "erro" } as const;
const entrada = "!min-h-10 !rounded-lg !text-sm";
const TODAS_ABAS = [
  ["resumo", "Resumo"],
  ["administradores", "Administradores"],
  ["secretarias", "Secretarias"],
  ["usuarios", "Usuários"],
  ["tce", "Integração TCE-CE"],
  ["marca", "Logo e temporalidade"],
  ["uso", "Uso"],
  ["auditoria", "Auditoria"],
] as const;
const ABAS = TODAS_ABAS.filter(([v]) => v !== "tce" || MODULOS.tce);
const reais = (c: number | null) => (c === null ? "" : (c / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 }));
const rotuloMini = "text-[11px] font-medium tracking-[.05em] text-texto-suave uppercase";

// Quadro EquipePrefeituraDetalhe: cabeçalho e abas Resumo, Administradores, Integração TCE-CE, Uso e Auditoria.
export default async function DetalhePrefeitura({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ aba?: string; item?: string; editar?: string; importou?: string; marca?: string }> }) {
  await exigirEquipe();
  const { id } = await params;
  const busca = await searchParams;
  if (!idSchema.safeParse(id).success) notFound();
  const p = await obterPrefeitura(id);
  if (!p) notFound();
  const aba = ABAS.find(([v]) => v === busca.aba)?.[0] ?? "resumo";
  const editar = busca.editar === "1" && aba === "resumo";
  const [admins, usoTodas, suporte, integ] = await Promise.all([listarAdministradores(id), usoPrefeituras(), suporteAutorizadoAte(id), integracoes()]);
  const uso = usoTodas.get(id);
  const i = integ.get(id);
  const aviso = busca.importou ? AVISOS_IMPORTAR[busca.importou] : undefined;
  const [marca, parceiras] = aba === "marca" ? await Promise.all([marcaDoOrgao(id), listarParceiras()]) : [null, []];
  const avisoMarca = busca.marca ? ({ ok: "Marca salva.", logo: "O logo precisa ser PNG ou SVG de até 1 MB.", demo: "Modo demonstração: nada foi salvo.", erro: "Não foi possível salvar. Confira os dados." } as Record<string, string>)[busca.marca] : undefined;
  const acoes = aba === "auditoria" ? await acoesEquipe({ prefeitura: id, limite: 50 }) : [];
  const href = (a: string) => `/equipe/${id}?aba=${a}`;

  return (
    <PaginaEquipe
      titulo="Prefeitura"
      trilha={
        <span>
          <Link href="/equipe" className="text-destaque hover:underline">Equipe LicCONT</Link>
          {" › "}
          <Link href="/equipe/prefeituras" className="text-destaque hover:underline">Prefeituras</Link>
          {` › ${p.nome}`}
        </span>
      }
    >
      <Painel>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <span aria-hidden className="flex size-[52px] items-center justify-center rounded-[14px] bg-[linear-gradient(145deg,#5eead4,#0e7490)] text-white">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 21V8l8-5 8 5v13M9 21v-6h6v6" /></svg>
            </span>
            <div>
              <h2 className="text-xl font-bold">{p.nome}</h2>
              <p className="mt-0.5 text-[13px] text-texto-suave">
                <span className="font-mono font-medium">{formatarCnpj(p.cnpj)}</span> · Plano {p.plano === "completo" ? "Completo" : p.plano}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Pilula tom={TONS[p.status]}>{SITUACOES[p.status]}</Pilula>
            <Link href={`/equipe/${id}?aba=resumo&editar=1`} className={botaoContorno}>Editar dados</Link>
          </div>
        </div>
      </Painel>

      <Filtros itens={ABAS.map(([v, r]) => ({ href: href(v), rotulo: r, ativo: aba === v }))} />

      {aviso && <p role="status" className={`rounded-lg px-4 py-2.5 text-sm font-medium ${aviso.erro ? "bg-[#fee2e2] text-[#991b1b] dark:bg-[#3f1d1d] dark:text-[#fca5a5]" : "bg-[#ccfbf1] text-[#115e59] dark:bg-[#0e4a45] dark:text-[#7ff0df]"}`}>{aviso.texto}</p>}

      {aba === "resumo" && (
        <div className="grid items-start gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
          <Painel>
            <span className={rotuloMini}>Situação da prefeitura</span>
            <Formulario acao={mudarStatus} botao="Salvar" enviando="Salvando…" className="gap-3.5">
              <input type="hidden" name="id" value={p.id} />
              <Selecao rotulo="Situação" name="status" defaultValue={p.status} className={entrada}>
                {Object.entries(SITUACOES).map(([valor, rotulo]) => (
                  <option key={valor} value={valor}>{rotulo}</option>
                ))}
              </Selecao>
            </Formulario>
            <p className="text-[12.5px] text-texto-suave">Suspender bloqueia o acesso de todos, sem apagar nada. Reativar devolve o acesso. Os dados continuam podendo ser exportados pelo administrador.</p>
          </Painel>
          <div className="flex min-w-0 flex-col gap-4">
            <Painel>
              <span className={rotuloMini}>Contrato</span>
              <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                {([["Plano", p.plano === "completo" ? "Completo" : p.plano], ["Implantação", formatarReais(p.implantacaoCentavos)], ["Mensalidade", formatarReais(p.mensalidadeCentavos)], ["Início do contrato", formatarData(p.contratoInicio)]] as const).map(([r, v]) => (
                  <div key={r}><dt className="text-texto-suave">{r}</dt><dd className="font-semibold">{v}</dd></div>
                ))}
              </dl>
            </Painel>
            {uso && <ResumoUso uso={uso} suporte={suporte} />}
            {editar && (
              <Painel>
                <CabecalhoPainel icone={<span>✎</span>} titulo="Editar dados" subtitulo={MODULOS.tce ? "Nome, CNPJ, contrato e integração com o TCE-CE" : "Nome, CNPJ e contrato"} />
                <Formulario acao={atualizarPrefeitura} botao="Salvar dados" enviando="Salvando…" className="gap-3.5">
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="plano" value="completo" />
                  <div className="grid gap-3.5 sm:grid-cols-2">
                    <Campo rotulo="Nome do órgão" name="nome" required maxLength={200} defaultValue={p.nome} className={entrada} />
                    <Campo rotulo="CNPJ" name="cnpj" inputMode="numeric" required defaultValue={formatarCnpj(p.cnpj)} className={entrada} />
                    <Campo rotulo="Implantação (R$)" name="valor_implantacao" inputMode="decimal" defaultValue={reais(p.implantacaoCentavos)} className={entrada} />
                    <Campo rotulo="Mensalidade (R$)" name="valor_mensalidade" inputMode="decimal" defaultValue={reais(p.mensalidadeCentavos)} className={entrada} />
                    <Campo rotulo="Início do contrato" name="contrato_inicio" type="date" defaultValue={p.contratoInicio ?? ""} className={entrada} />
                    {MODULOS.tce && <Campo rotulo="Código do município no TCE" name="tce_codigo_municipio" inputMode="numeric" defaultValue={p.tceCodigo ?? ""} className={entrada} />}
                  </div>
                  {MODULOS.tce && <label className="flex items-center gap-2.5 text-sm font-medium">
                    <input type="checkbox" name="tce_ativo" defaultChecked={i?.ativo ?? false} className="size-4 accent-[#0e7490]" />
                    Integração com o TCE-CE ligada
                  </label>}
                </Formulario>
              </Painel>
            )}
          </div>
        </div>
      )}

      {aba === "administradores" && (
        <Painel>
          <CabecalhoPainel
            icone={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0" /></svg>}
            titulo="Administradores"
            subtitulo="Quem gerencia a prefeitura no sistema."
          />
          {admins.length > 0 && (
            <div className="-mx-5 overflow-x-auto">
              <table className="w-full text-left">
                <caption className="sr-only">Administradores da prefeitura</caption>
                <thead>
                  <tr className={linhaCabecalho}>
                    <th scope="col" className={th}>Nome</th>
                    <th scope="col" className={th}>E-mail</th>
                    <th scope="col" className={th}>Situação</th>
                    <th scope="col" className={th}><span className="sr-only">Ações</span></th>
                  </tr>
                </thead>
                <tbody>
                  {admins.map((a, n) => (
                    <tr key={a.id} className={classeLinha(false, n % 2 === 1)}>
                      <td className={`${td} font-semibold`}>{a.nome}</td>
                      <td className={`${td} text-[13px] text-texto-suave`}>{a.email}</td>
                      <td className={td}><Pilula tom={a.ativo ? "ok" : "aviso"}>{a.ativo ? "Ativo" : "Inativo"}</Pilula></td>
                      <td className={`${td} text-right`}>
                        {a.ativo && (
                          <form action={removerAdmin}>
                            <input type="hidden" name="prefeitura" value={p.id} />
                            <input type="hidden" name="usuario" value={a.id} />
                            <BotaoConfirmar aviso="Remover este administrador? Ele perde o acesso." className={botaoContorno}>Remover</BotaoConfirmar>
                          </form>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold">Convidar administrador</h3>
            <Formulario acao={convidarAdmin} botao="Cadastrar administrador" enviando="Cadastrando…" className="gap-3.5">
              <input type="hidden" name="id" value={p.id} />
              <div className="grid gap-3.5 sm:grid-cols-2">
                <Campo rotulo="Nome" name="nome" required maxLength={200} placeholder="Nome do servidor" className={entrada} />
                <Campo rotulo="E-mail institucional" name="email" type="email" autoComplete="off" required placeholder="nome@prefeitura.gov.br" className={entrada} />
              </div>
            </Formulario>
          </div>
          <p className="text-[12.5px] text-texto-suave">Sem administrador, a prefeitura fica em Pendências até um novo ser cadastrado.</p>
        </Painel>
      )}

      {aba === "secretarias" && <AbaSecretarias prefeitura={id} item={busca.item} />}

      {aba === "usuarios" && <AbaUsuarios prefeitura={id} item={busca.item} />}

      {aba === "tce" && MODULOS.tce && (
        <Painel>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold">Integração com o TCE-CE</h2>
              <p className="text-[12.5px] text-texto-suave">Busca automática toda noite, às 02:00. Só números e datas.</p>
            </div>
            <Pilula tom={!i?.ativo ? "aviso" : i.situacao === "erro" ? "erro" : "ok"}>{!i?.ativo ? "Desligada" : i.situacao === "erro" ? "Com erro" : "Ligada"}</Pilula>
          </div>
          <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            <div><dt className="text-texto-suave">Código do município</dt><dd className="font-mono font-semibold">{p.tceCodigo ?? "—"}</dd></div>
            <div><dt className="text-texto-suave">Última importação</dt><dd className="font-semibold">{quando(i?.ultimaEm ?? null)}</dd></div>
            <div><dt className="text-texto-suave">Novos na última rodada</dt><dd className="font-mono font-semibold">{i?.novos ?? 0}</dd></div>
            <div><dt className="text-texto-suave">Erros em 7 dias</dt><dd className="font-mono font-semibold">{i?.erros7d ?? 0}</dd></div>
          </dl>
          {i?.ativo && (
            <form action={importarPelaEquipe}>
              <input type="hidden" name="id" value={p.id} />
              <input type="hidden" name="volta" value="detalhe" />
              <BotaoEnviar className={`${botaoPrimario}`}>Importar agora</BotaoEnviar>
            </form>
          )}
        </Painel>
      )}

      {aba === "marca" && (
        <>
          {avisoMarca && <p role="status" className={`rounded-lg px-4 py-2.5 text-sm font-medium ${busca.marca === "ok" ? "bg-[#ccfbf1] text-[#115e59] dark:bg-[#0e4a45] dark:text-[#7ff0df]" : "bg-[#fee2e2] text-[#991b1b] dark:bg-[#3f1d1d] dark:text-[#fca5a5]"}`}>{avisoMarca}</p>}
          <div className="grid items-start gap-4 xl:grid-cols-[400px_minmax(0,1fr)]">
            <Painel>
              <CabecalhoPainel
                icone={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 3h10l4 4v14H5zM14 3v5h5" /></svg>}
                titulo="Logos da Prefeitura e da Câmara"
                subtitulo="Sai no topo das etiquetas, da folha de conteúdo e dos relatórios."
              />
              {marca && <FormMarca id={id} marca={marca} parceiras={parceiras} />}
            </Painel>
            <Painel>
              <CabecalhoPainel
                icone={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 3h10l4 4v14H5zM9 13h6M9 17h6" /></svg>}
                titulo="Tabela de temporalidade"
                subtitulo="Código de classificação e prazo de guarda que saem nas etiquetas."
              />
              <Link href={`/equipe/${id}/temporalidade`} className={botaoContorno}>Abrir a tabela</Link>
            </Painel>
          </div>
        </>
      )}

      {aba === "uso" && (uso ? <ResumoUso uso={uso} suporte={suporte} /> : <Painel><p className="text-sm text-texto-suave">Sem dados de uso.</p></Painel>)}

      {aba === "auditoria" && (
        <Painel>
          <h2 className="text-base font-bold">Ações da equipe nesta prefeitura</h2>
          <ul className="flex flex-col divide-y divide-linha">
            {acoes.map((a) => (
              <li key={a.id} className="py-2.5">
                <span className="block text-sm font-semibold">{textoAcao(a.acao, a.statusNovo)}</span>
                <span className="block text-[12.5px] text-texto-suave">{a.quem} · {quando(a.criadoEm)}</span>
              </li>
            ))}
            {acoes.length === 0 && <li className="py-2.5 text-sm text-texto-suave">Nenhuma ação registrada.</li>}
          </ul>
        </Painel>
      )}
      <p className="text-[12.5px] text-texto-suave">Só quantidades. A equipe não vê o conteúdo do acervo.</p>
    </PaginaEquipe>
  );
}

function ResumoUso({ uso, suporte }: { uso: UsoPrefeitura; suporte: string | null }) {
  return (
    <Painel>
      <span className={rotuloMini}>Uso (só números)</span>
      <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
        {([["Secretarias", uso.secretarias.toLocaleString("pt-BR")], ["Usuários ativos", uso.usuarios.toLocaleString("pt-BR")], ["Documentos", uso.documentos.toLocaleString("pt-BR")], ["Caixas", uso.caixas.toLocaleString("pt-BR")], ["PDFs guardados", `${formatarGb(uso.bytesPdf)} de ${formatarGb(uso.limiteBytes)}`], ["Logins no mês", uso.loginsMes.toLocaleString("pt-BR")], ["Último acesso", quando(uso.ultimoAcesso)]] as const).map(([r, v]) => (
          <div key={r}><dt className="text-texto-suave">{r}</dt><dd className="font-mono text-base font-semibold">{v}</dd></div>
        ))}
      </dl>
      <p className="text-[12.5px] text-texto-suave">{suporte ? `Acesso de suporte autorizado pela prefeitura até ${new Date(suporte).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}.` : "Sem autorização de suporte valendo."}</p>
    </Painel>
  );
}
