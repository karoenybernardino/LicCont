import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Pilula } from "@/ui/canvas";
import { exigirSessao, secretariasPermitidas } from "@/features/sessao/dal";
import { PaginaSistema } from "@/features/sessao/pagina";
import { cursorDoBanco, obterDocumento, pesquisar } from "@/features/documentos/dados";
import { esquemaId } from "@/features/documentos/esquemas";
import { FAIXAS_VALOR, faixaDeValor, lerFiltros, paraQuery, filtrosAtivos, type Aba, type Filtros } from "@/features/documentos/filtros";
import { EscolhaCompacta } from "@/features/documentos/escolha-compacta";
import { PainelDocumento, tomSituacao } from "@/features/documentos/painel";
import { MODALIDADES, SITUACOES, SITUACOES_CONTRATO } from "@/features/documentos/tipos";
import { tituloDocumento } from "@/features/documentos/titulo";
import { documentosEmprestados } from "@/features/movimento/dados";

export const metadata: Metadata = { title: "Pesquisa · LicCONT" };

// Pesquisa como no quadro "Pesquisa — filtros novos" do canvas: a página fica
// do tamanho da janela; a lista de resultados e o detalhe do documento rolam
// cada um no seu quadro (barra fina turquesa), nunca a página inteira.

const rotulo = "text-[10.5px] font-semibold tracking-[.06em] text-texto-suave uppercase";
const grupo =
  "flex min-w-0 flex-col gap-2 rounded-[10px] border border-linha border-t-[3px] border-t-[#0e7490] bg-superficie-2 px-3 pt-2.5 pb-3";
const botaoBorda =
  "flex items-center gap-[7px] rounded-[9px] border border-borda-campo bg-campo px-3.5 text-[13px] font-medium shadow-[0_1px_2px_rgba(11,46,58,.06)] hover:border-[#0e7490] focus-visible:outline-2 focus-visible:outline-foco dark:shadow-none";

const Ico = ({ children, tam = 14, cor = "#0e7490" }: { children: ReactNode; tam?: number; cor?: string }) => (
  <svg aria-hidden width={tam} height={tam} viewBox="0 0 24 24" fill="none" stroke={cor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
    {children}
  </svg>
);
const Seta = () => (
  <svg aria-hidden width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-texto-suave">
    <path d="M6 9l6 6 6-6" />
  </svg>
);

// Campo de escolha: ícone à esquerda, texto e seta, como o botão do quadro; por
// baixo é um <select> de verdade (teclado, leitor de tela e formulário).
function Escolha({ nome, rotulo: r, valor, opcoes, vazio, icone }: { nome: string; rotulo: string; valor: string | null; opcoes: [string, string][]; vazio: string; icone: ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className={rotulo}>{r}</span>
      <span className="relative block">
        <span className="pointer-events-none absolute top-1/2 left-[9px] -translate-y-1/2">{icone}</span>
        <select
          name={nome}
          defaultValue={valor ?? ""}
          className="h-9 w-full appearance-none truncate rounded-lg border border-borda-campo bg-campo pr-7 pl-[30px] text-[13px] font-medium text-texto shadow-[0_1px_2px_rgba(11,46,58,.06)] hover:border-[#0e7490] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-foco dark:shadow-none"
        >
          <option value="">{vazio}</option>
          {opcoes.map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <Seta />
      </span>
    </label>
  );
}

export default async function Pesquisa({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { usuario, secretaria } = await exigirSessao();
  const params = await searchParams;
  const f = lerFiltros(params);
  const [r, secretarias, emprestados] = await Promise.all([pesquisar(usuario, f), secretariasPermitidas(usuario), documentosEmprestados()]);
  const nomes = new Map(secretarias.filter((s) => s.id).map((s) => [s.id as string, s.nome]));
  const pedido = typeof params.doc === "string" && esquemaId.safeParse({ id: params.doc }).success ? params.doc : null;
  // Como no quadro: sem documento escolhido, o primeiro da lista já aparece no detalhe.
  const idDoc = pedido ?? r.itens[0]?.id ?? null;
  // Com um documento escolhido, a coluna da esquerda fica compacta (quadro "painel do documento").
  const compacto = pedido !== null;
  const doc = idDoc ? await obterDocumento(idDoc) : null;
  const base = (mudar: Partial<Filtros>) => paraQuery({ ...f, cursor: null, ...mudar });
  const comDoc = (id: string) => `/pesquisa?${[paraQuery({ ...f }), `doc=${id}`].filter(Boolean).join("&")}`;
  const ativos = filtrosAtivos(f);
  const abas: [Aba, string, number][] = [
    ["todos", "Todos", r.contagens.todos],
    ["licitacao", "Licitações", r.contagens.licitacao],
    ["contrato", "Contratos", r.contagens.contrato],
  ];
  const proximo = cursorDoBanco(r.proximo);
  const anoAtual = new Date().getFullYear();
  const anos: [string, string][] = Array.from({ length: anoAtual - 1999 }, (_, i) => String(anoAtual - i)).map((a) => [a, a]);
  const valorAtual = faixaDeValor(f.vmin, f.vmax);
  const faixasValor = FAIXAS_VALOR.some(([k]) => k === valorAtual) || !valorAtual ? FAIXAS_VALOR : [...FAIXAS_VALOR, [valorAtual, "Faixa personalizada"] as [string, string]];
  const ordens = [["recentes", "Mais recentes"], ["antigos", "Mais antigos"], ["maior_valor", "Maior valor"]] as const;
  const ordemAtual = ordens.find(([k]) => k === f.ordem)?.[1] ?? "Mais recentes";
  const mapa = r.itens.length > 0 ? `/mapa?codigos=${r.itens.filter((i) => i.codigo).slice(0, 50).map((i) => i.codigo).join(",")}` : "/mapa";

  return (
    <PaginaSistema usuario={usuario} secretaria={secretaria} titulo="Pesquisa">
      {!compacto && (
      <form
        action="/pesquisa"
        role="search"
        aria-label="Pesquisa e filtros"
        className="flex shrink-0 flex-col gap-3 rounded-[14px] border border-linha bg-superficie px-4 py-3.5 shadow-[0_10px_28px_rgba(11,46,58,.08)] dark:shadow-none"
      >
        <input type="hidden" name="aba" value={f.aba} />
        <div className="flex flex-wrap items-center gap-2.5">
          <label className="flex h-10 min-w-60 flex-1 items-center gap-2.5 rounded-[10px] border border-borda-campo bg-campo px-3.5 shadow-[0_1px_2px_rgba(11,46,58,.06)] hover:border-[#0e7490] focus-within:outline-2 focus-within:outline-foco dark:shadow-none">
            <Ico tam={18}><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></Ico>
            <span className="sr-only">Buscar</span>
            <input name="q" defaultValue={f.q} maxLength={100} placeholder="Número do processo, objeto, credor ou CNPJ" className="min-w-0 flex-1 bg-transparent text-sm outline-0" />
            <kbd className="rounded-[5px] border border-borda-campo px-1.5 py-px font-mono text-[10.5px] text-texto-suave max-md:hidden">Enter</kbd>
          </label>
          <nav aria-label="Tipo de documento" className="flex gap-0.5 rounded-[11px] border border-linha bg-superficie-2 p-[3px]">
            {abas.map(([k, nome, n]) => {
              const ativa = f.aba === k;
              const cor = ativa ? "#ffffff" : "#3f5e66";
              return (
                <Link
                  key={k}
                  href={`/pesquisa?${base({ aba: k })}`}
                  aria-current={ativa ? "page" : undefined}
                  className={`flex h-8 items-center gap-[7px] rounded-lg px-3 text-[13px] whitespace-nowrap hover:shadow-[inset_0_0_0_1.5px_#0e7490] focus-visible:outline-2 focus-visible:outline-foco ${ativa ? "bg-[linear-gradient(135deg,#0e7490,#0f766e)] font-semibold text-white dark:bg-none dark:bg-[#2dd4bf] dark:text-[#0b2e3a]" : "font-medium"}`}
                >
                  {k === "todos" ? (
                    <Ico cor={cor}><path d="M3 5h18l-7 8v6l-4 2v-8z" /></Ico>
                  ) : k === "licitacao" ? (
                    <Ico cor={cor}><path d="M14 4l6 6M11 7l6 6M8 10l6-6M12.5 11.5L4 20" /></Ico>
                  ) : (
                    <Ico cor={cor}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M9 13h6M9 17h4" /></Ico>
                  )}
                  {nome}
                  <span className="font-mono text-[11px] opacity-75">{n}</span>
                </Link>
              );
            })}
          </nav>
          <Link href="/pesquisa" className={`${botaoBorda} h-10 shrink-0`}>
            <Ico cor="currentColor"><path d="M21 12a9 9 0 1 1-3-6.7L21 8" /><path d="M21 3v5h-5" /></Ico>
            Limpar
          </Link>
        </div>

        <div className="grid gap-2.5 lg:grid-cols-[1.75fr_1.75fr_3.5fr]">
          <fieldset className={grupo}>
            <legend className="sr-only">Período</legend>
            <span className="flex items-center gap-[7px] font-titulo text-[12.5px] font-semibold">
              <Ico><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Ico>
              Período
            </span>
            <div className="grid grid-cols-2 gap-2">
              <Escolha nome="de" rotulo="Ano inicial" valor={f.de === null ? null : String(f.de)} vazio="Todos" opcoes={anos} icone={<Ico><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></Ico>} />
              <Escolha nome="ate" rotulo="Ano final" valor={f.ate === null ? null : String(f.ate)} vazio="Todos" opcoes={anos} icone={<Ico><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></Ico>} />
            </div>
          </fieldset>
          <fieldset className={grupo}>
            <legend className="sr-only">Licitação</legend>
            <span className="flex items-center gap-[7px] font-titulo text-[12.5px] font-semibold">
              <Ico><path d="M14 4l6 6M11 7l6 6M8 10l6-6M12.5 11.5L4 20" /></Ico>
              Licitação
            </span>
            <div className="grid grid-cols-2 gap-2">
              <Escolha nome="modalidade" rotulo="Modalidade" valor={f.modalidade} vazio="Todas" opcoes={Object.entries(MODALIDADES)} icone={<Ico><circle cx="12" cy="9" r="5" /><path d="M9 13.5L8 21l4-2 4 2-1-7.5" /></Ico>} />
              <Escolha nome="origem" rotulo="Origem" valor={f.origem} vazio="Todas as origens" opcoes={[["manual", "Cadastrado à mão"], ["planilha", "Importado de planilha"], ["tce", "Importado do TCE"]]} icone={<Ico><path d="M12 3v12M7 10l5 5 5-5M4 21h16" /></Ico>} />
              <Escolha nome="secretaria" rotulo="Secretaria" valor={f.secretaria} vazio="Todas" opcoes={[...nomes.entries()]} icone={<Ico><rect x="9" y="3" width="6" height="5" rx="1" /><rect x="3" y="16" width="6" height="5" rx="1" /><rect x="15" y="16" width="6" height="5" rx="1" /><path d="M12 8v4M6 16v-4h12v4" /></Ico>} />
            </div>
          </fieldset>
          <fieldset className={grupo}>
            <legend className="sr-only">Contratos</legend>
            <span className="flex items-center gap-[7px] font-titulo text-[12.5px] font-semibold">
              <Ico><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M9 13h6M9 17h4" /></Ico>
              Contratos
            </span>
            <div className="grid grid-cols-3 gap-2 max-sm:grid-cols-1">
              <Escolha nome="situacao" rotulo="Situação" valor={f.situacao} vazio="Todas" opcoes={Object.entries(SITUACOES_CONTRATO)} icone={<Ico><path d="M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2" /></Ico>} />
              <Escolha nome="valor" rotulo="Valor" valor={valorAtual} vazio="Qualquer valor" opcoes={faixasValor} icone={<Ico><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="3" /><path d="M6 10v4M18 10v4" /></Ico>} />
              <Escolha nome="vigencia" rotulo="Vigência" valor={f.vigencia} vazio="Todos" opcoes={[["vigentes", "Vigentes"], ["vencidos", "Vencidos"], ["vencem_30", "Vencem em 30 dias"]]} icone={<Ico><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5M12 7v5l3 2" /></Ico>} />
            </div>
          </fieldset>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <span className="inline-flex items-center gap-[7px] rounded-lg border border-[#99f6e4] bg-[#ccfbf1] px-2.5 py-1 text-[12.5px] font-semibold text-[#115e59] dark:border-[#1b3a44] dark:bg-[#0d2a30] dark:text-[#99f6e4]" role="status">
            <b className="font-mono">{r.total}</b> {r.total === 1 ? "documento encontrado" : "documentos encontrados"}
            {ativos > 0 && <span className="font-normal"> · {ativos} {ativos === 1 ? "filtro" : "filtros"}</span>}
          </span>
          <div className="flex gap-2">
            <Link href={mapa} className={`${botaoBorda} h-9`}>
              <Ico tam={15} cor="currentColor"><path d="M12 2l9 5v10l-9 5-9-5V7z" /><path d="M12 12l9-5M12 12L3 7M12 12v10" /></Ico>
              Ver no mapa 3D
            </Link>
            <button type="submit" className="flex h-9 items-center gap-[7px] rounded-[9px] bg-[linear-gradient(135deg,#0e7490,#0f766e)] px-[18px] text-[13px] font-semibold text-white shadow-[0_4px_12px_rgba(14,116,144,.25)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco dark:bg-none dark:bg-[#2dd4bf] dark:text-[#0b2e3a]">
              <Ico tam={15} cor="currentColor"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></Ico>
              Pesquisar ({r.total})
            </button>
          </div>
        </div>
      </form>
      )}

      <div className="grid min-h-[520px] flex-1 gap-6 lg:min-h-0 lg:grid-cols-[minmax(340px,460px)_1fr] lg:items-stretch">
        <section aria-label="Resultados" className="flex min-h-0 flex-col overflow-hidden rounded-[14px] border border-linha bg-superficie max-lg:max-h-[70vh]">
          {compacto && (
            <form action="/pesquisa" role="search" aria-label="Pesquisa e filtros" className="flex shrink-0 flex-col gap-3 border-b border-linha p-4">
              <input type="hidden" name="aba" value={f.aba} />
              <input type="hidden" name="doc" value={idDoc ?? ""} />
              {f.de === null && f.ate !== null && <input type="hidden" name="ate" value={f.ate} />}
              {f.vmin !== null && <input type="hidden" name="vmin" value={f.vmin} />}
              {f.vmax !== null && <input type="hidden" name="vmax" value={f.vmax} />}
              {f.vigencia && <input type="hidden" name="vigencia" value={f.vigencia} />}
              {f.ordem !== "recentes" && <input type="hidden" name="ordem" value={f.ordem} />}
              <label className="flex min-h-11 items-center gap-2.5 rounded-lg border border-borda-campo bg-campo px-3 focus-within:outline-2 focus-within:outline-foco">
                <Ico tam={18} cor="currentColor"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></Ico>
                <span className="sr-only">Buscar</span>
                <input name="q" defaultValue={f.q} maxLength={100} placeholder="Número, objeto ou empresa" className="min-w-0 flex-1 bg-transparent text-[15px] outline-0" />
              </label>
              <nav aria-label="Tipo de documento" className="flex gap-1 rounded-[13px] border border-linha bg-superficie-2 p-[3px]">
                {abas.map(([k, nome, n]) => {
                  const ativa = f.aba === k;
                  return (
                    <Link
                      key={k}
                      href={`/pesquisa?${base({ aba: k })}&doc=${idDoc}`}
                      aria-current={ativa ? "page" : undefined}
                      className={`flex min-h-[38px] flex-1 items-center justify-center gap-2 rounded-[10px] border text-[13px] hover:border-[#0e7490] focus-visible:outline-2 focus-visible:outline-foco ${ativa ? "border-[#0e7490] bg-[linear-gradient(90deg,rgba(45,212,191,.2),rgba(45,212,191,0))] font-semibold dark:border-[#2dd4bf]" : "border-transparent"}`}
                    >
                      {nome}
                      <span className={`rounded-[9px] px-[7px] py-px font-mono text-[11px] font-medium ${ativa ? "bg-[#2dd4bf] text-[#0b2e3a]" : "bg-superficie-2 text-texto-suave"}`}>{n}</span>
                    </Link>
                  );
                })}
              </nav>
              <div className="grid grid-cols-4 items-center gap-2">
                {f.de !== null && (
                  <Link href={`/pesquisa?${base({ de: null, ate: null })}&doc=${idDoc}`} aria-label={`Remover filtro Ano: ${f.de}`} className="flex h-[34px] items-center gap-2 rounded-lg border-2 border-[#0e7490] bg-campo px-2.5 text-[13px] dark:border-[#2dd4bf]">
                    Ano: {f.de}
                    <span aria-hidden>×</span>
                  </Link>
                )}
                {f.de === null && <EscolhaCompacta nome="de" rotulo="Ano" valor={null} opcoes={anos} />}
                <EscolhaCompacta nome="secretaria" rotulo="Secretaria" valor={f.secretaria} opcoes={[...nomes.entries()]} />
                <EscolhaCompacta nome="situacao" rotulo="Situação" valor={f.situacao} opcoes={Object.entries(SITUACOES_CONTRATO)} />
                <EscolhaCompacta nome="modalidade" rotulo="Modalidade" valor={f.modalidade} opcoes={Object.entries(MODALIDADES)} />
                <noscript>
                  <button type="submit">Aplicar</button>
                </noscript>
              </div>
            </form>
          )}
          <div className="flex shrink-0 items-center justify-between gap-3 px-4 py-2.5 text-[13px] text-texto-suave">
            <span>
              <b className="font-semibold text-texto">{r.total}</b> resultados
              {compacto && ativos > 0 && (
                <>
                  {" · "}
                  <Link href={`/pesquisa?doc=${idDoc}`} className="text-destaque hover:underline">Limpar filtros</Link>
                </>
              )}
            </span>
            <details className="relative">
              <summary className="flex min-h-8 cursor-pointer list-none items-center gap-1.5 rounded-lg border border-linha px-2.5 text-xs text-texto hover:border-[#0e7490] focus-visible:outline-2 focus-visible:outline-foco [&::-webkit-details-marker]:hidden">
                {ordemAtual}
                <svg aria-hidden width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
              </summary>
              <nav aria-label="Ordem" className="absolute top-full right-0 z-10 mt-1 flex w-40 flex-col rounded-lg border border-linha bg-superficie p-1 shadow-[0_10px_28px_rgba(11,46,58,.18)]">
                {ordens.map(([k, nome]) => (
                  <Link key={k} href={`/pesquisa?${base({ ordem: k })}`} aria-current={f.ordem === k ? "true" : undefined} className={`rounded-md px-2.5 py-1.5 text-xs hover:bg-superficie-2 focus-visible:outline-2 focus-visible:outline-foco ${f.ordem === k ? "font-semibold text-texto" : "text-texto-suave"}`}>
                    {nome}
                  </Link>
                ))}
              </nav>
            </details>
          </div>
          <div tabIndex={0} className="sc min-h-0 flex-1 overflow-y-auto focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-foco">
            {r.itens.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-texto-suave">
                Nenhum documento encontrado. <Link href="/pesquisa" className="text-destaque underline">Limpar filtros</Link>
              </p>
            ) : (
              <ul>
                {r.itens.map((d) => (
                  <li key={d.id}>
                    <Link
                      href={comDoc(d.id)}
                      aria-current={d.id === idDoc ? "true" : undefined}
                      className={`flex min-h-11 flex-col gap-1.5 border-b border-l-[3px] border-b-linha px-4 py-3.5 hover:shadow-[inset_0_0_0_1.5px_#0e7490] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-foco ${d.id === idDoc ? "border-l-aqua bg-[rgba(45,212,191,.18)]" : "border-l-transparent"}`}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="font-titulo text-[15px] font-semibold">{tituloDocumento(d)}</span>
                        <span className="flex items-center gap-1.5">
                          {emprestados.has(d.id) && <Pilula tom="aviso">Emprestado</Pilula>}
                          <Pilula tom={tomSituacao(d.situacao)}>{SITUACOES[d.situacao] ?? d.situacao}</Pilula>
                        </span>
                      </span>
                      <span className="text-[13px] text-texto-suave">
                        {d.objeto}
                        {d.empresa ? ` · ${d.empresa}` : ""}
                      </span>
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-medium text-texto-suave">{d.codigo ?? "Sem endereço"}</span>
                        {d.origem === "tce" && <Pilula tom="aviso">Importado do TCE</Pilula>}
                        {d.origem === "planilha" && <Pilula tom="aviso">Importado de planilha</Pilula>}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {proximo && (
              <div className="px-4 py-3 text-center">
                <Link href={`/pesquisa?${base({ cursor: proximo })}`} className="text-[13px] font-medium text-destaque hover:underline">
                  Ver mais resultados
                </Link>
              </div>
            )}
          </div>
        </section>
        {doc ? (
          <div tabIndex={0} className="sc min-h-0 min-w-0 overflow-y-auto focus-visible:outline-2 focus-visible:outline-foco lg:pr-1">
            <PainelDocumento doc={doc} usuario={usuario} />
          </div>
        ) : (
          <p className="rounded-[14px] border border-dashed border-linha p-8 text-center text-sm text-texto-suave max-lg:hidden">
            Escolha um documento da lista para ver os detalhes.
          </p>
        )}
      </div>
    </PaginaSistema>
  );
}
