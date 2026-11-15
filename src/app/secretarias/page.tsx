import type { Metadata } from "next";
import Link from "next/link";
import { Busca, Filtros, Pilula, botaoContorno, botaoPrimario } from "@/ui/canvas";
import { Painel, classeLinha, linhaCabecalho, td, th } from "@/features/estrutura/componentes";
import { exigirAdmin } from "@/features/sessao/dal";
import { PaginaSistema } from "@/features/sessao/pagina";
import { listarSecretariasDetalhe } from "@/features/secretarias/dados";
import { listarUsuarios } from "@/features/usuarios/dados";

export const metadata: Metadata = { title: "Secretarias · LicCONT" };

const SITUACOES = ["todas", "ativas", "desativadas"] as const;
const minusculo = (t: string) => t.toLocaleLowerCase("pt-BR");

export default async function Secretarias({ searchParams }: { searchParams: Promise<{ q?: string; situacao?: string }> }) {
  const { usuario, secretaria } = await exigirAdmin();
  const busca = await searchParams;
  const q = (busca.q ?? "").trim().slice(0, 120);
  const situacao = SITUACOES.find((s) => s === busca.situacao) ?? "todas";
  const [todas, usuarios] = await Promise.all([listarSecretariasDetalhe(), listarUsuarios()]);
  const nome = new Map(usuarios.map((u) => [u.id, u.nome]));

  const lista = todas.filter(
    (s) =>
      (situacao === "todas" || s.ativa === (situacao === "ativas")) &&
      (minusculo(s.nome).includes(minusculo(q)) || minusculo(s.sigla ?? "").includes(minusculo(q))),
  );
  const nAtivas = todas.filter((s) => s.ativa).length;
  const href = (s: string) => `/secretarias?${new URLSearchParams({ ...(q && { q }), ...(s !== "todas" && { situacao: s }) })}`;

  return (
    <PaginaSistema usuario={usuario} secretaria={secretaria} titulo="Secretarias" trilha="Prefeitura › Configurações › Secretarias">
      <Painel className="pb-1.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Busca acao="/secretarias" valor={q} rotulo="Buscar secretaria ou sigla" marcador="Buscar secretaria ou sigla" extra={situacao === "todas" ? undefined : { situacao }} />
          <div className="flex flex-wrap items-center gap-2.5">
            <Filtros
              itens={[
                { href: href("todas"), rotulo: `Todas · ${todas.length}`, ativo: situacao === "todas" },
                { href: href("ativas"), rotulo: `Ativas · ${nAtivas}`, ativo: situacao === "ativas" },
                { href: href("desativadas"), rotulo: `Desativadas · ${todas.length - nAtivas}`, ativo: situacao === "desativadas" },
              ]}
            />
            <Link href="/secretarias/nova" className={botaoPrimario}>+ Nova secretaria</Link>
          </div>
        </div>
        <div className="-mx-5 -mb-1.5 overflow-x-auto">
          <table className="w-full text-left">
            <caption className="sr-only">Secretarias da prefeitura</caption>
            <thead>
              <tr className={linhaCabecalho}>
                <th scope="col" className={th}>Secretaria</th>
                <th scope="col" className={th}>Sigla</th>
                <th scope="col" className={th}>Responsável</th>
                <th scope="col" className={th}>Usuários</th>
                <th scope="col" className={th}>Documentos</th>
                <th scope="col" className={th}>Situação</th>
                <th scope="col" className={th}><span className="sr-only">Ações</span></th>
              </tr>
            </thead>
            <tbody>
              {lista.map((s, i) => {
                const nUsuarios = usuarios.filter((u) => u.secretarias.includes(s.id)).length;
                return (
                  <tr key={s.id} className={classeLinha(false, i % 2 === 1)}>
                    <td className={`${td} w-full font-semibold`}>{s.nome}</td>
                    <td className={`${td} font-mono text-[13px]`}>{s.sigla ?? "—"}</td>
                    <td className={`${td} whitespace-nowrap`}>{(s.responsavelId && nome.get(s.responsavelId)) || "—"}</td>
                    <td className={td}>{nUsuarios}</td>
                    <td className={`${td} font-mono text-[13px] font-medium`}>{s.documentos}</td>
                    <td className={td}>
                      {!s.ativa ? <Pilula tom="aviso">Desativada</Pilula> : nUsuarios === 0 ? <Pilula tom="aviso">Sem usuários</Pilula> : <Pilula tom="ok">Ativa</Pilula>}
                    </td>
                    <td className={`${td} text-right`}>
                      <Link href={`/secretarias/${s.id}`} aria-label={`Editar ${s.nome}`} className={botaoContorno}>Editar</Link>
                    </td>
                  </tr>
                );
              })}
              {lista.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-sm text-texto-suave">Nenhuma secretaria encontrada.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Painel>
      <p className="flex items-center gap-2 px-1 text-[13px] text-texto-suave">
        <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-destaque"><path d="M6 3h12v18H6z" /><path d="M9 8h6M9 12h6M9 16h3" /></svg>
        Cada prefeitura tem a própria lista. Secretaria com documentos ou usuários não é apagada: ela é desativada e o histórico continua na auditoria.
      </p>
    </PaginaSistema>
  );
}
