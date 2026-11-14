import type { Metadata } from "next";
import Link from "next/link";
import { Campo } from "@/ui/campo";
import { Formulario } from "@/ui/formulario";
import { Busca, CabecalhoPainel, Filtros, Pilula, botaoPrimario } from "@/ui/canvas";
import { Painel, classeLinha, linhaCabecalho, td, th } from "@/features/estrutura/componentes";
import { exigirAdmin } from "@/features/sessao/dal";
import { Icone, PaginaSistema } from "@/features/sessao/pagina";
import { alternarSecretaria, cadastrarSecretaria } from "@/features/secretarias/acoes";
import { listarSecretarias, listarUsuarios } from "@/features/usuarios/dados";

export const metadata: Metadata = { title: "Secretarias · LicCONT" };

const SITUACOES = ["todas", "ativas", "desativadas"] as const;

export default async function Secretarias({ searchParams }: { searchParams: Promise<{ q?: string; situacao?: string }> }) {
  const { usuario, secretaria } = await exigirAdmin();
  const busca = await searchParams;
  const q = (busca.q ?? "").trim().slice(0, 120);
  const situacao = SITUACOES.find((s) => s === busca.situacao) ?? "todas";
  const [todas, usuarios] = await Promise.all([listarSecretarias(), listarUsuarios()]);

  const lista = todas.filter(
    (s) =>
      (situacao === "todas" || s.ativa === (situacao === "ativas")) &&
      s.nome.toLocaleLowerCase("pt-BR").includes(q.toLocaleLowerCase("pt-BR")),
  );
  const nAtivas = todas.filter((s) => s.ativa).length;
  const href = (s: string) => `/secretarias?${new URLSearchParams({ ...(q && { q }), ...(s !== "todas" && { situacao: s }) })}`;

  return (
    <PaginaSistema usuario={usuario} secretaria={secretaria} titulo="Secretarias">
      <Painel className="pb-1.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Busca acao="/secretarias" valor={q} rotulo="Buscar secretaria" marcador="Buscar secretaria" extra={situacao === "todas" ? undefined : { situacao }} />
          <div className="flex flex-wrap items-center gap-2.5">
            <Filtros
              itens={[
                { href: href("todas"), rotulo: `Todas · ${todas.length}`, ativo: situacao === "todas" },
                { href: href("ativas"), rotulo: `Ativas · ${nAtivas}`, ativo: situacao === "ativas" },
                { href: href("desativadas"), rotulo: `Desativadas · ${todas.length - nAtivas}`, ativo: situacao === "desativadas" },
              ]}
            />
            <Link href="#nova-secretaria" className={botaoPrimario}>+ Nova secretaria</Link>
          </div>
        </div>
        <div className="-mx-5 -mb-1.5 overflow-x-auto">
          <table className="w-full text-left">
            <caption className="sr-only">Secretarias da prefeitura</caption>
            <thead>
              <tr className={linhaCabecalho}>
                <th scope="col" className={th}>Secretaria</th>
                <th scope="col" className={th}>Usuários</th>
                <th scope="col" className={th}>Documentos</th>
                <th scope="col" className={th}>Situação</th>
                <th scope="col" className={th}><span className="sr-only">Ações</span></th>
              </tr>
            </thead>
            <tbody>
              {lista.map((s, i) => (
                <tr key={s.id} className={classeLinha(false, i % 2 === 1)}>
                  <td className={`${td} w-full font-semibold`}>{s.nome}</td>
                  <td className={td}>{usuarios.filter((u) => u.secretarias.includes(s.id)).length}</td>
                  <td className={`${td} font-mono text-[13px] font-medium`}>0</td>
                  <td className={td}>{s.ativa ? <Pilula tom="ok">Ativa</Pilula> : <Pilula tom="aviso">Desativada</Pilula>}</td>
                  <td className={`${td} text-right`}>
                    <Formulario
                      acao={alternarSecretaria}
                      botao={s.ativa ? `Desativar ${s.nome}` : `Reativar ${s.nome}`}
                      enviando="Salvando…"
                      variante="secundario"
                      classeBotao="h-8 min-h-0! px-3 text-[12.5px]! font-normal! whitespace-nowrap"
                    >
                      <input type="hidden" name="id" value={s.id} />
                      <input type="hidden" name="ativa" value={s.ativa ? "nao" : "sim"} />
                    </Formulario>
                  </td>
                </tr>
              ))}
              {lista.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sm text-texto-suave">Nenhuma secretaria encontrada.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Painel>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Painel>
          <div id="nova-secretaria" className="scroll-mt-4">
            <CabecalhoPainel
              icone={<Icone nome="secretarias" className="size-[18px]" />}
              titulo="Dados da secretaria"
              subtitulo="Como aparece nos filtros, etiquetas e relatórios"
            />
          </div>
          <Formulario acao={cadastrarSecretaria} botao="Cadastrar" enviando="Cadastrando…" className="max-w-md">
            <Campo rotulo="Nome da secretaria" name="nome" required maxLength={120} />
          </Formulario>
        </Painel>
        <Painel>
          <span className="text-[11px] font-medium tracking-[.05em] text-texto-suave uppercase">O que acontece ao salvar</span>
          {["A secretaria passa a aparecer no login e nos filtros desta prefeitura.", "Ela não aparece para nenhuma outra prefeitura."].map((t, i) => (
            <div key={t} className="flex items-start gap-2.5">
              <span aria-hidden className="flex size-[22px] shrink-0 items-center justify-center rounded-full bg-[#ccfbf1] font-mono text-[11px] font-medium text-[#0e7490] dark:bg-[#0e4a45] dark:text-[#7ff0df]">
                {i + 1}
              </span>
              <span className="text-[13px] leading-[19px]">{t}</span>
            </div>
          ))}
        </Painel>
      </div>
    </PaginaSistema>
  );
}
