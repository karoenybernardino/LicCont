import type { Metadata } from "next";
import Link from "next/link";
import { Busca, CartaoResumo, Filtros, Pilula, botaoContorno, botaoPrimario } from "@/ui/canvas";
import { PaginaEquipe } from "@/features/equipe/pagina";
import { Painel, classeLinha, linhaCabecalho, td, th } from "@/features/estrutura/componentes";
import { Icone } from "@/features/sessao/barra-lateral";
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

// Painel da equipe LicCONT (quadro EquipePrefeituras).
export default async function PainelEquipe({ searchParams }: { searchParams: Promise<{ q?: string; situacao?: string }> }) {
  await exigirEquipe();
  const busca = await searchParams;
  const q = (busca.q ?? "").trim().slice(0, 120);
  const situacao = FILTROS.find(([v]) => v === busca.situacao)?.[0] ?? "todas";
  const todas = await listarPrefeituras();
  const n = (s: StatusPrefeitura) => todas.filter((p) => p.status === s).length;
  const uso = await usoPrefeituras();
  const docs = [...uso.values()].reduce((t, u) => t + u.documentos, 0);
  const lista = filtrarPrefeituras(todas, q, situacao);
  const admins = todas.reduce((t, p) => t + p.administradores, 0);
  const semAdmin = todas.filter((p) => p.administradores === 0).length;
  const href = (s: string) => `/equipe?${new URLSearchParams({ ...(q && { q }), ...(s !== "todas" && { situacao: s }) })}`;

  return (
    <PaginaEquipe titulo="Prefeituras">
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <CartaoResumo rotulo="Prefeituras" valor={String(todas.length)} legenda={`${n("ativa")} ${n("ativa") === 1 ? "ativa" : "ativas"} · ${n("implantacao")} em implantação`} cor="teal" icone={<Icone nome="secretarias" />} />
        <CartaoResumo rotulo="Administradores" valor={String(admins)} legenda="em todas as prefeituras" cor="aco" icone={<Icone nome="usuarios" />} />
        <CartaoResumo rotulo="Documentos no ar" valor={docs.toLocaleString("pt-BR")} legenda="cadastrados em todas as prefeituras" cor="ambar" icone={<Icone nome="cadastro" />} />
        <CartaoResumo rotulo="Pendências" valor={String(semAdmin)} legenda="prefeituras sem administrador ativo" cor="vermelho" icone={<Icone nome="auditoria" />} />
      </div>

      <Painel className="pb-1.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Busca acao="/equipe" valor={q} rotulo="Buscar por nome ou CNPJ" marcador="Buscar por nome ou CNPJ" extra={situacao === "todas" ? undefined : { situacao }} />
          <div className="flex max-w-full flex-wrap items-center gap-2.5">
            <Filtros
              itens={FILTROS.map(([v, r]) => ({
                href: href(v),
                rotulo: `${r} · ${v === "todas" ? todas.length : n(v)}`,
                ativo: situacao === v,
              }))}
            />
            <Link href="/equipe/nova" className={botaoPrimario}>+ Nova prefeitura</Link>
          </div>
        </div>
        <div className="-mx-5 -mb-1.5 overflow-x-auto">
          <table className="w-full text-left">
            <caption className="sr-only">Prefeituras cadastradas</caption>
            <thead>
              <tr className={linhaCabecalho}>
                <th scope="col" className={th}>Prefeitura</th>
                <th scope="col" className={th}>CNPJ</th>
                <th scope="col" className={th}>Situação</th>
                <th scope="col" className={th}>Administradores</th>
                <th scope="col" className={th}>Cadastrada em</th>
                <th scope="col" className={th}><span className="sr-only">Ações</span></th>
              </tr>
            </thead>
            <tbody>
              {lista.map((p, i) => (
                <tr key={p.id} className={classeLinha(false, i % 2 === 1)}>
                  <td className={`${td} w-full font-semibold`}>{p.nome}</td>
                  <td className={`${td} font-mono text-[13px] font-medium`}>{formatarCnpj(p.cnpj)}</td>
                  <td className={td}><Pilula tom={TONS[p.status]}>{SITUACOES[p.status]}</Pilula></td>
                  <td className={`${td} font-mono text-[13px] font-medium`}>{p.administradores}</td>
                  <td className={`${td} font-mono text-[13px] font-medium`}>{formatarData(p.criadoEm)}</td>
                  <td className={`${td} text-right`}>
                    <Link href={`/equipe/${p.id}`} aria-label={`Abrir ${p.nome}`} className={botaoContorno}>Abrir</Link>
                  </td>
                </tr>
              ))}
              {lista.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-sm text-texto-suave">Nenhuma prefeitura encontrada.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Painel>
    </PaginaEquipe>
  );
}
