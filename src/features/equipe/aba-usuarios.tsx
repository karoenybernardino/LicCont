import Link from "next/link";
import { Campo } from "@/ui/campo";
import { Formulario } from "@/ui/formulario";
import { Pilula, botaoContorno } from "@/ui/canvas";
import { Etiqueta, Painel, TituloPainel, td, th } from "@/features/estrutura/componentes";
import { alternarBloqueio, cadastrarUsuario, encerrarSessoes, redefinirSenha, salvarUsuario } from "@/features/usuarios/acoes";
import { CamposUsuario } from "@/features/usuarios/campos";
import { listarSecretarias, listarUsuarios } from "@/features/usuarios/dados";
import { PERFIS } from "@/features/usuarios/esquemas";

// Aba "Usuários" do cadastro da prefeitura: só a equipe LicCONT cadastra e edita.
// "item" = id de um usuário abre a edição dele.
export async function AbaUsuarios({ prefeitura, item }: { prefeitura: string; item?: string }) {
  const [usuarios, secretarias] = await Promise.all([listarUsuarios(undefined, prefeitura), listarSecretarias(prefeitura)]);
  const aqui = `/equipe/${prefeitura}?aba=usuarios`;
  const alvo = usuarios.find((u) => u.id === item);

  if (alvo) {
    // Secretaria desativada continua na lista se a pessoa ainda tiver vínculo.
    const opcoes = secretarias.filter((s) => s.ativa || alvo.secretarias.includes(s.id));
    const oculto = (
      <>
        <input type="hidden" name="prefeitura" value={prefeitura} />
        <input type="hidden" name="id" value={alvo.id} />
      </>
    );
    return (
      <>
        <p className="px-1 text-[13px] text-texto-suave">
          <Link href={aqui} className="text-destaque underline-offset-2 hover:underline">Usuários</Link>
          {" › "}
          <b className="font-semibold text-texto">{alvo.nome}</b> · {alvo.email}
        </p>
        <Painel>
          <TituloPainel>Dados e perfil</TituloPainel>
          <Formulario acao={salvarUsuario} botao="Salvar" enviando="Salvando…" className="max-w-md">
            {oculto}
            <CamposUsuario secretarias={opcoes} inicial={alvo} />
          </Formulario>
        </Painel>
        <div className="grid gap-4 md:grid-cols-3">
          <Painel>
            <TituloPainel>{alvo.ativo ? "Bloquear" : "Desbloquear"}</TituloPainel>
            <p className="text-sm text-texto-suave">{alvo.ativo ? "A pessoa perde o acesso na hora." : "A pessoa volta a entrar com a senha dela."}</p>
            <Formulario acao={alternarBloqueio} botao={alvo.ativo ? "Bloquear usuário" : "Desbloquear usuário"} enviando="Salvando…" variante="secundario">
              {oculto}
              <input type="hidden" name="bloquear" value={alvo.ativo ? "sim" : "nao"} />
            </Formulario>
          </Painel>
          <Painel>
            <TituloPainel>Redefinir senha</TituloPainel>
            <p className="text-[13px] text-texto-suave">Gera uma senha provisória nova e encerra as sessões.</p>
            <Formulario acao={redefinirSenha} botao="Redefinir senha" enviando="Gerando…" variante="secundario">
              {oculto}
            </Formulario>
          </Painel>
          <Painel>
            <TituloPainel>Encerrar sessões</TituloPainel>
            <p className="text-[13px] text-texto-suave">Desconecta a pessoa de todos os aparelhos.</p>
            <Formulario acao={encerrarSessoes} botao="Encerrar sessões" enviando="Encerrando…" variante="secundario">
              {oculto}
            </Formulario>
          </Painel>
        </div>
      </>
    );
  }

  return (
    <>
      <Painel className="pb-1.5">
        <TituloPainel>Usuários</TituloPainel>
        <p className="text-[12.5px] text-texto-suave">Só a equipe LicCONT cadastra e edita usuários. O administrador da prefeitura só consulta.</p>
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
                    <Link href={`${aqui}&item=${u.id}`} className={`${botaoContorno} w-[84px]`}>
                      Editar<span className="sr-only"> {u.nome}</span>
                    </Link>
                  </td>
                </tr>
              ))}
              {usuarios.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sm text-texto-suave">Nenhum usuário cadastrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Painel>
      <Painel>
        <h2 id="cadastrar-usuario" className="scroll-mt-4 text-[17px] font-bold">Cadastrar usuário</h2>
        <Formulario acao={cadastrarUsuario} botao="Cadastrar" enviando="Cadastrando…" className="max-w-md">
          <input type="hidden" name="prefeitura" value={prefeitura} />
          <Campo rotulo="E-mail" name="email" type="email" autoComplete="off" required />
          <CamposUsuario secretarias={secretarias.filter((s) => s.ativa)} />
        </Formulario>
      </Painel>
    </>
  );
}
