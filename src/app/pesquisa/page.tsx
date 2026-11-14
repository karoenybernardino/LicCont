import type { Metadata } from "next";
import Link from "next/link";
import { Pilula } from "@/ui/canvas";
import { exigirSessao, secretariasPermitidas } from "@/features/sessao/dal";
import { PaginaSistema } from "@/features/sessao/pagina";
import { cursorDoBanco, obterDocumento, pesquisar } from "@/features/documentos/dados";
import { esquemaId } from "@/features/documentos/esquemas";
import { lerFiltros, paraQuery, filtrosAtivos, type Aba, type Filtros } from "@/features/documentos/filtros";
import { PainelDocumento, tomSituacao } from "@/features/documentos/painel";
import { MODALIDADES, SITUACOES, SITUACOES_CONTRATO } from "@/features/documentos/tipos";
import { tituloDocumento } from "@/features/documentos/titulo";

export const metadata: Metadata = { title: "Pesquisa · LicCONT" };

const campo =
  "h-9 w-full rounded-lg border border-borda-campo bg-campo px-2.5 text-[13px] font-medium text-texto focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-foco";
const rotulo = "text-[10.5px] font-semibold tracking-[.06em] text-texto-suave uppercase";
const grupo =
  "flex min-w-0 flex-col gap-2 rounded-[10px] border border-linha border-t-[3px] border-t-teal bg-superficie-2 px-3 pt-2.5 pb-3";

function Seletor({ nome, rotulo: r, valor, opcoes, vazio }: { nome: string; rotulo: string; valor: string | null; opcoes: [string, string][]; vazio: string }) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className={rotulo}>{r}</span>
      <select name={nome} defaultValue={valor ?? ""} className={campo}>
        <option value="">{vazio}</option>
        {opcoes.map(([k, v]) => (
          <option key={k} value={k}>{v}</option>
        ))}
      </select>
    </label>
  );
}

function Numero({ nome, rotulo: r, valor, marcador }: { nome: string; rotulo: string; valor: number | null; marcador?: string }) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className={rotulo}>{r}</span>
      <input name={nome} type="number" inputMode="numeric" min={0} defaultValue={valor ?? ""} placeholder={marcador} className={campo} />
    </label>
  );
}

export default async function Pesquisa({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { usuario, secretaria } = await exigirSessao();
  const params = await searchParams;
  const f = lerFiltros(params);
  const [r, secretarias] = await Promise.all([pesquisar(usuario, f), secretariasPermitidas(usuario)]);
  const nomes = new Map(secretarias.filter((s) => s.id).map((s) => [s.id as string, s.nome]));
  const idDoc = typeof params.doc === "string" && esquemaId.safeParse({ id: params.doc }).success ? params.doc : null;
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

  return (
    <PaginaSistema usuario={usuario} secretaria={secretaria} titulo="Pesquisa">
      <form
        action="/pesquisa"
        role="search"
        aria-label="Pesquisa e filtros"
        className="flex flex-col gap-3 rounded-[14px] border border-linha bg-superficie px-4 py-3.5 shadow-[0_10px_28px_rgba(11,46,58,.08)] dark:shadow-none"
      >
        <input type="hidden" name="aba" value={f.aba} />
        <div className="flex flex-wrap items-center gap-2.5">
          <label className="flex h-10 min-w-60 flex-1 items-center gap-2.5 rounded-[10px] border border-borda-campo bg-campo px-3.5 focus-within:outline-2 focus-within:outline-foco">
            <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="shrink-0 text-texto-suave">
              <circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" />
            </svg>
            <span className="sr-only">Buscar</span>
            <input name="q" defaultValue={f.q} maxLength={100} placeholder="Número do processo, objeto, credor ou CNPJ" className="min-w-0 flex-1 bg-transparent text-sm outline-0" />
          </label>
          <nav aria-label="Tipo de documento" className="flex gap-0.5 rounded-[11px] border border-linha bg-superficie-2 p-[3px]">
            {abas.map(([k, nome, n]) => (
              <Link
                key={k}
                href={`/pesquisa?${base({ aba: k })}`}
                aria-current={f.aba === k ? "page" : undefined}
                className={`flex h-8 items-center gap-1.5 rounded-lg px-3 text-[13px] whitespace-nowrap focus-visible:outline-2 focus-visible:outline-foco ${f.aba === k ? "bg-[linear-gradient(135deg,#0e7490,#0f766e)] font-semibold text-white dark:bg-none dark:bg-[#2dd4bf] dark:text-[#0b2e3a]" : "font-medium"}`}
              >
                {nome}
                <span className="font-mono text-[11px] opacity-80">{n}</span>
              </Link>
            ))}
          </nav>
          <Link href="/pesquisa" className="flex h-10 items-center rounded-[9px] border border-linha px-3.5 text-[13px] font-medium hover:border-destaque focus-visible:outline-2 focus-visible:outline-foco">
            Limpar
          </Link>
        </div>

        <div className="grid gap-2.5 lg:grid-cols-[1fr_1fr_2fr]">
          <fieldset className={grupo}>
            <legend className="sr-only">Período e secretaria</legend>
            <span className="font-titulo text-[12.5px] font-semibold">Período</span>
            <div className="grid grid-cols-2 gap-2">
              <Numero nome="de" rotulo="Ano inicial" valor={f.de} marcador="2010" />
              <Numero nome="ate" rotulo="Ano final" valor={f.ate} marcador={String(new Date().getFullYear())} />
            </div>
          </fieldset>
          <fieldset className={grupo}>
            <legend className="sr-only">Licitação</legend>
            <span className="font-titulo text-[12.5px] font-semibold">Licitação</span>
            <div className="grid grid-cols-2 gap-2">
              <Seletor nome="modalidade" rotulo="Modalidade" valor={f.modalidade} vazio="Todas" opcoes={Object.entries(MODALIDADES)} />
              <Seletor nome="secretaria" rotulo="Secretaria" valor={f.secretaria} vazio="Todas" opcoes={[...nomes.entries()]} />
            </div>
          </fieldset>
          <fieldset className={grupo}>
            <legend className="sr-only">Contratos</legend>
            <span className="font-titulo text-[12.5px] font-semibold">Contratos</span>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Seletor nome="situacao" rotulo="Situação" valor={f.situacao} vazio="Todas" opcoes={Object.entries(SITUACOES_CONTRATO)} />
              <Numero nome="vmin" rotulo="Valor mínimo" valor={f.vmin} marcador="R$" />
              <Numero nome="vmax" rotulo="Valor máximo" valor={f.vmax} marcador="R$" />
              <Seletor nome="vigencia" rotulo="Vigência" valor={f.vigencia} vazio="Todos" opcoes={[["vigentes", "Vigentes"], ["vencidos", "Vencidos"], ["vencem_30", "Vencem em 30 dias"]]} />
            </div>
          </fieldset>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#99f6e4] bg-[#ccfbf1] px-2.5 py-1 text-[12.5px] font-semibold text-[#115e59] dark:border-[#1b3a44] dark:bg-[#0d2a30] dark:text-[#99f6e4]" role="status">
            <b className="font-mono">{r.total}</b> {r.total === 1 ? "documento encontrado" : "documentos encontrados"}
            {ativos > 0 && <span className="font-normal"> · {ativos} {ativos === 1 ? "filtro" : "filtros"}</span>}
          </span>
          <button type="submit" className="flex h-9 items-center rounded-[9px] bg-[linear-gradient(135deg,#0e7490,#0f766e)] px-[18px] text-[13px] font-semibold text-white shadow-[0_4px_12px_rgba(14,116,144,.25)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco dark:bg-none dark:bg-[#2dd4bf] dark:text-[#0b2e3a]">
            Pesquisar
          </button>
        </div>
      </form>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(340px,460px)_1fr]">
        <section aria-label="Resultados" className="overflow-hidden rounded-[14px] border border-linha bg-superficie">
          <div className="flex items-center justify-between gap-3 px-4 py-2.5 text-[13px] text-texto-suave">
            <span><b className="font-semibold text-texto">{r.total}</b> resultados</span>
            {r.itens.length > 0 && (
              <Link href={`/mapa?codigos=${r.itens.slice(0, 50).map((i) => i.codigo).join(",")}`} className="rounded-lg border border-linha px-2.5 py-1 text-xs hover:border-destaque focus-visible:outline-2 focus-visible:outline-foco">
                Ver no mapa 3D
              </Link>
            )}
            <nav aria-label="Ordem" className="flex gap-1.5">
              {([["recentes", "Mais recentes"], ["antigos", "Mais antigos"], ["maior_valor", "Maior valor"]] as const).map(([k, nome]) => (
                <Link key={k} href={`/pesquisa?${base({ ordem: k })}`} aria-current={f.ordem === k ? "true" : undefined} className={`rounded-lg border px-2.5 py-1 text-xs focus-visible:outline-2 focus-visible:outline-foco ${f.ordem === k ? "border-destaque text-texto" : "border-linha"}`}>
                  {nome}
                </Link>
              ))}
            </nav>
          </div>
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
                    className={`flex min-h-11 flex-col gap-1.5 border-b border-l-[3px] border-b-linha px-4 py-3.5 hover:bg-superficie-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-foco ${d.id === idDoc ? "border-l-aqua bg-[rgba(45,212,191,.18)]" : "border-l-transparent"}`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-titulo text-[15px] font-semibold">{tituloDocumento(d)}</span>
                      <Pilula tom={tomSituacao(d.situacao)}>{SITUACOES[d.situacao] ?? d.situacao}</Pilula>
                    </span>
                    <span className="text-[13px] text-texto-suave">
                      {d.objeto}
                      {d.empresa ? ` · ${d.empresa}` : ""}
                    </span>
                    <span className="font-mono text-xs font-medium text-texto-suave">{d.codigo}</span>
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
        </section>
        {doc ? (
          <PainelDocumento doc={doc} usuario={usuario} />
        ) : (
          <p className="rounded-[14px] border border-dashed border-linha p-8 text-center text-sm text-texto-suave max-lg:hidden">
            Escolha um documento da lista para ver os detalhes.
          </p>
        )}
      </div>
    </PaginaSistema>
  );
}
