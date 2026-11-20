import type { Metadata } from "next";
import { MODULOS } from "@/features/modulos/ocultos";
import Link from "next/link";
import { Busca, CartaoResumo, Filtros, Pilula, botaoContorno, botaoPrimario } from "@/ui/canvas";
import { BotaoEnviar } from "@/ui/botao-enviar";
import { PaginaEquipe } from "@/features/equipe/pagina";
import { Painel, classeLinha, linhaCabecalho, td, th } from "@/features/estrutura/componentes";
import { Icone } from "@/features/sessao/barra-lateral";
import { importarPelaEquipe } from "@/features/equipe/acoes";
import { integracoes } from "@/features/equipe/dados";
import { AVISOS_IMPORTAR, formatarGb, quando } from "@/features/equipe/textos";
import { listarPrefeituras, usoPrefeituras } from "@/features/prefeituras/dados";
import { filtrarPrefeituras, formatarCnpj, type StatusPrefeitura } from "@/features/prefeituras/lista";
import { formatarData } from "@/features/documentos/formato";
import { exigirEquipe } from "@/features/sessao/dal";

export const metadata: Metadata = { title: "Prefeituras · LicCONT" };

const SITUACOES = { implantacao: "Em implantação", ativa: "Ativa", suspensa: "Suspensa" } as const;
const TONS = { implantacao: "aviso", ativa: "ok", suspensa: "erro" } as const;
const FILTROS = [
  ["todas", "Todas"],
  ["ativa", "Ativas"],
  ["implantacao", "Implantação"],
  ["suspensa", "Suspensas"],
] as const;

// Prefeituras da equipe (quadro EquipePrefeituras): lista + painel lateral.
export default async function Prefeituras({ searchParams }: { searchParams: Promise<{ q?: string; situacao?: string; sel?: string; importou?: string }> }) {
  await exigirEquipe();
  const busca = await searchParams;
  const q = (busca.q ?? "").trim().slice(0, 120);
  const situacao = FILTROS.find(([v]) => v === busca.situacao)?.[0] ?? "todas";
  const [todas, uso, integ] = await Promise.all([listarPrefeituras(), usoPrefeituras(), integracoes()]);
  const n = (s: StatusPrefeitura) => todas.filter((p) => p.status === s).length;
  const docs = [...uso.values()].reduce((t, u) => t + u.documentos, 0);
  const lista = filtrarPrefeituras(todas, q, situacao);
  const admins = todas.reduce((t, p) => t + p.administradores, 0);
  const semAdmin = todas.filter((p) => p.administradores === 0).length;
  const sel = todas.find((p) => p.id === busca.sel) ?? lista[0] ?? null;
  const href = (s: string, id?: string) => `/equipe/prefeituras?${new URLSearchParams({ ...(q && { q }), ...(s !== "todas" && { situacao: s }), ...(id && { sel: id }) })}`;
  const tce = (id: string) => {
    const i = integ.get(id);
    return !i?.ativo ? { rotulo: "Desligada", tom: "aviso" as const } : i.situacao === "erro" ? { rotulo: "Com erro", tom: "erro" as const } : { rotulo: "Ligada", tom: "ok" as const };
  };
  const aviso = busca.importou ? AVISOS_IMPORTAR[busca.importou] : undefined;
  const usoSel = sel ? uso.get(sel.id) : undefined;
  const integSel = sel ? integ.get(sel.id) : undefined;

  return (
    <PaginaEquipe titulo="Prefeituras">
      <div className="flex justify-end">
        <Link href="/equipe/prefeituras/parceiras" className={botaoContorno}>Empresas parceiras</Link>
      </div>
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <CartaoResumo rotulo="Prefeituras" valor={String(todas.length)} legenda={`${n("ativa")} ${n("ativa") === 1 ? "ativa" : "ativas"} · ${n("implantacao")} em implantação`} cor="teal" icone={<Icone nome="secretarias" />} />
        <CartaoResumo rotulo="Administradores" valor={String(admins)} legenda="em todas as prefeituras" cor="aco" icone={<Icone nome="usuarios" />} />
        <CartaoResumo rotulo="Documentos no ar" valor={docs.toLocaleString("pt-BR")} legenda="soma de todas as prefeituras" cor="ambar" icone={<Icone nome="cadastro" />} />
        <CartaoResumo rotulo="Pendências" valor={String(semAdmin)} legenda="prefeituras sem administrador ativo" cor="vermelho" icone={<Icone nome="auditoria" />} />
      </div>

      {aviso && <p role="status" className={`rounded-lg px-4 py-2.5 text-sm font-medium ${aviso.erro ? "bg-[#fee2e2] text-[#991b1b] dark:bg-[#3f1d1d] dark:text-[#fca5a5]" : "bg-[#ccfbf1] text-[#115e59] dark:bg-[#0e4a45] dark:text-[#7ff0df]"}`}>{aviso.texto}</p>}

      <div className="grid min-h-0 gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Painel className="pb-1.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Busca acao="/equipe/prefeituras" valor={q} rotulo="Buscar por nome ou CNPJ" marcador="Buscar por nome ou CNPJ" extra={situacao === "todas" ? undefined : { situacao }} />
            <div className="flex max-w-full flex-wrap items-center gap-2.5">
              <Filtros itens={FILTROS.map(([v, r]) => ({ href: href(v), rotulo: `${r} · ${v === "todas" ? todas.length : n(v)}`, ativo: situacao === v }))} />
              <Link href="/equipe/nova" className={botaoPrimario}>+ Nova prefeitura</Link>
            </div>
          </div>
          <div className="-mx-5 -mb-1.5 overflow-x-auto">
            <table className="w-full text-left">
              <caption className="sr-only">Prefeituras cadastradas</caption>
              <thead>
                <tr className={linhaCabecalho}>
                  <th scope="col" className={th}>Prefeitura</th>
                  <th scope="col" className={th}>Situação</th>
                  <th scope="col" className={th}>TCE-CE</th>
                  <th scope="col" className={th}>Docs</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((p, i) => (
                  <tr key={p.id} className={classeLinha(p.id === sel?.id, i % 2 === 1)}>
                    <td className={`${td} w-full`}>
                      <Link href={href(situacao, p.id)} aria-current={p.id === sel?.id ? "true" : undefined} className="block focus-visible:outline-2 focus-visible:outline-foco">
                        <span className="block font-semibold">{p.nome}</span>
                        <span className="block font-mono text-[12.5px] text-texto-suave">{formatarCnpj(p.cnpj)}</span>
                      </Link>
                    </td>
                    <td className={td}><Pilula tom={TONS[p.status]}>{SITUACOES[p.status]}</Pilula></td>
                    <td className={td}><Pilula tom={tce(p.id).tom}>{tce(p.id).rotulo}</Pilula></td>
                    <td className={`${td} font-mono text-[13px] font-medium`}>{(uso.get(p.id)?.documentos ?? 0).toLocaleString("pt-BR")}</td>
                  </tr>
                ))}
                {lista.length === 0 && (
                  <tr><td colSpan={MODULOS.tce ? 4 : 3} className="px-4 py-6 text-center text-sm text-texto-suave">Nenhuma prefeitura encontrada.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Painel>

        {sel && (
          <Painel className="gap-3.5 self-start">
            <div className="flex items-start justify-between gap-2.5">
              <div className="min-w-0">
                <div className="text-xs text-texto-suave">Prefeitura selecionada</div>
                <h2 className="mt-0.5 font-titulo text-[19px] leading-6 font-bold">{sel.nome}</h2>
                <div className="mt-0.5 font-mono text-[12.5px] font-medium text-texto-suave">{formatarCnpj(sel.cnpj)}</div>
              </div>
              <Pilula tom={TONS[sel.status]}>{SITUACOES[sel.status]}</Pilula>
            </div>
            <div className="h-px bg-linha" />
            <dl className="flex flex-col gap-3.5 text-[13.5px]">
              {([
                ["Plano", sel.plano === "completo" ? "Completo" : sel.plano],
                ["Contrato", sel.contratoInicio ? `desde ${formatarData(sel.contratoInicio)}` : "—"],
                ["Administradores", String(sel.administradores)],
                ["Secretarias", String(usoSel?.secretarias ?? 0)],
                ["Documentos", (usoSel?.documentos ?? 0).toLocaleString("pt-BR")],
                ["PDFs guardados", formatarGb(usoSel?.bytesPdf ?? 0)],
                ["Último acesso", quando(usoSel?.ultimoAcesso ?? null)],
              ] as const).map(([r, v]) => (
                <div key={r} className="flex justify-between gap-2.5">
                  <dt className="text-texto-suave">{r}</dt>
                  <dd className="text-right font-medium">{v}</dd>
                </div>
              ))}
            </dl>
            {MODULOS.tce && integSel?.situacao === "erro" && (
              <p className="rounded-lg border-l-[3px] border-[#ef4444] bg-[#ef4444]/10 px-3 py-2.5 text-[12.5px] leading-[18px]">
                <b>TCE-CE com erro.</b> Última rodada falhou {quando(integSel.ultimaEm)}.
              </p>
            )}
            <div className="flex gap-2.5">
              <Link href={`/equipe/${sel.id}`} className={`${botaoPrimario} flex-1`}>Abrir prefeitura</Link>
              {MODULOS.tce && integSel?.ativo && (
                <form action={importarPelaEquipe}>
                  <input type="hidden" name="id" value={sel.id} />
                  <BotaoEnviar className={`${botaoContorno} h-10 px-5 text-sm`}>Importar agora</BotaoEnviar>
                </form>
              )}
            </div>
          </Painel>
        )}
      </div>
    </PaginaEquipe>
  );
}
