import type { Metadata } from "next";
import Link from "next/link";
import { Campo } from "@/ui/campo";
import { Formulario } from "@/ui/formulario";
import { Pilula, botaoContorno, botaoPrimario } from "@/ui/canvas";
import { Etiqueta, Painel, Rotulo, TituloPainel, td, th } from "@/features/estrutura/componentes";
import { exigirAdmin } from "@/features/sessao/dal";
import { PaginaSistema } from "@/features/sessao/pagina";
import { cadastrarUsuario } from "@/features/usuarios/acoes";
import { CamposUsuario } from "@/features/usuarios/campos";
import { listarSecretarias, listarUsuarios } from "@/features/usuarios/dados";
import { PERFIS, type Perfil } from "@/features/usuarios/esquemas";

export const metadata: Metadata = { title: "Usuários e perfis · LicCONT" };

const DESCRICAO: Record<Perfil, string> = {
  administrador: "Controle total do sistema e dos usuários",
  coordenador: "Cadastra, empresta, descarta e aprova termos",
  operador: "Cadastra documentos e registra empréstimos",
  consulta: "Somente pesquisa e visualização de etiquetas",
};

// Quem pode o quê (administrador, coordenador, operador, consulta), como no canvas.
const PERMISSOES: [string, [boolean, boolean, boolean, boolean]][] = [
  ["Pesquisar acervo", [true, true, true, true]],
  ["Cadastrar documento", [true, true, true, false]],
  ["Registrar empréstimo", [true, true, true, false]],
  ["Descartar documento", [true, true, false, false]],
  ["Gerenciar usuários", [true, false, false, false]],
  ["Ver auditoria", [true, true, false, false]],
];

function Marca({ sim }: { sim: boolean }) {
  return sim ? (
    <span className="mx-auto flex size-[22px] items-center justify-center rounded-[7px] bg-[linear-gradient(145deg,#5eead4,#0e7490)] dark:bg-[#2dd4bf]">
      <svg aria-hidden width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" className="dark:stroke-[#0b2e3a]">
        <path d="M5 12.5l4.5 4.5L19 7" />
      </svg>
      <span className="sr-only">Sim</span>
    </span>
  ) : (
    <span className="mx-auto block size-[22px] rounded-[7px] border-[1.5px] border-linha">
      <span className="sr-only">Não</span>
    </span>
  );
}

export default async function Usuarios() {
  const { usuario, secretaria } = await exigirAdmin();
  const [usuarios, secretarias] = await Promise.all([listarUsuarios(), listarSecretarias()]);
  const ativas = secretarias.filter((s) => s.ativa);
  const perfis = Object.entries(PERFIS) as [Perfil, string][];

  return (
    <PaginaSistema usuario={usuario} secretaria={secretaria} titulo="Usuários e perfis" trilha="Administração · Acesso">
      <div className="grid items-start gap-4 xl:grid-cols-[1fr_1.5fr]">
        <Painel>
          <Rotulo>Perfis</Rotulo>
          {perfis.map(([chave, nome]) => {
            const n = usuarios.filter((u) => u.perfil === chave).length;
            return (
              <div key={chave} className="flex flex-col gap-2 rounded-2xl border border-linha bg-white/78 px-[18px] py-4 dark:bg-transparent">
                <div className="flex items-center justify-between">
                  <Etiqueta>{nome}</Etiqueta>
                  <span className="font-mono text-xs font-medium text-texto-suave">
                    {n} {n === 1 ? "usuário" : "usuários"}
                  </span>
                </div>
                <p className="text-[13px] leading-[19px] text-texto-suave">{DESCRICAO[chave]}</p>
              </div>
            );
          })}
        </Painel>

        <Painel className="pb-1.5">
          <TituloPainel>Permissões por perfil</TituloPainel>
          <table className="-mx-5 w-[calc(100%+40px)] border-collapse">
            <thead>
              <tr className="border-b border-linha bg-[rgba(14,116,144,.08)] dark:bg-[rgba(45,212,191,.07)]">
                <th scope="col" className="px-4 py-2.5 text-left text-xs font-semibold text-texto-suave">Permissão</th>
                {perfis.map(([chave, nome]) => (
                  <th key={chave} scope="col" className="px-2 py-2.5 text-center text-xs font-semibold text-texto-suave">
                    {nome}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSOES.map(([nome, marcas]) => (
                <tr key={nome} className="border-b border-linha">
                  <th scope="row" className="px-4 py-2.5 text-left text-sm font-normal">{nome}</th>
                  {marcas.map((sim, i) => (
                    <td key={i} className="px-2 py-2.5">
                      <Marca sim={sim} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </Painel>
      </div>

      <Painel className="pb-1.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TituloPainel>Usuários</TituloPainel>
          <Link href="#cadastrar-usuario" className={botaoPrimario}>Convidar usuário</Link>
        </div>
        <div className="-mx-5 overflow-x-auto">
          <table className="w-full text-left">
            <caption className="sr-only">Usuários da prefeitura</caption>
            <thead>
              <tr className="border-y border-linha bg-[rgba(14,116,144,.08)] dark:bg-[rgba(45,212,191,.07)]">
                <th scope="col" className={th}>Nome</th>
                <th scope="col" className={th}>E-mail</th>
                <th scope="col" className={th}>Perfil</th>
                <th scope="col" className={th}>Situação</th>
                <th scope="col" className={th}><span className="sr-only">Ações</span></th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id} className="border-b border-linha">
                  <td className={`${td} h-[52px] font-semibold`}>{u.nome}</td>
                  <td className={`${td} h-[52px] max-w-[280px] truncate text-[13px] text-texto-suave`}>{u.email}</td>
                  <td className={`${td} h-[52px]`}><Etiqueta>{PERFIS[u.perfil]}</Etiqueta></td>
                  <td className={`${td} h-[52px]`}>
                    {!u.ativo ? <Pilula tom="erro">Bloqueado</Pilula> : u.trocaSenha ? <Pilula tom="aviso">Senha provisória</Pilula> : <Pilula tom="ok">Ativo</Pilula>}
                  </td>
                  <td className={`${td} h-[52px] text-right`}>
                    <Link href={`/usuarios/${u.id}`} className={`${botaoContorno} w-[84px]`}>
                      Editar<span className="sr-only"> {u.nome}</span>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Painel>

      <Painel>
        <h2 id="cadastrar-usuario" className="scroll-mt-4 text-[17px] font-bold">Cadastrar usuário</h2>
        <Formulario acao={cadastrarUsuario} botao="Cadastrar" enviando="Cadastrando…" className="max-w-md">
          <Campo rotulo="E-mail" name="email" type="email" autoComplete="off" required />
          <CamposUsuario secretarias={ativas} />
        </Formulario>
      </Painel>
    </PaginaSistema>
  );
}
