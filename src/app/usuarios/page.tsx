import type { Metadata } from "next";
import Link from "next/link";
import { Campo } from "@/ui/campo";
import { Cartao } from "@/ui/cartao";
import { Formulario } from "@/ui/formulario";
import { exigirAdmin } from "@/features/sessao/dal";
import { PaginaSistema } from "@/features/sessao/pagina";
import { cadastrarUsuario } from "@/features/usuarios/acoes";
import { CamposUsuario } from "@/features/usuarios/campos";
import { listarSecretarias, listarUsuarios } from "@/features/usuarios/dados";
import { PERFIS } from "@/features/usuarios/esquemas";

export const metadata: Metadata = { title: "Usuários e perfis · LicCONT" };

export default async function Usuarios() {
  const { usuario, secretaria } = await exigirAdmin();
  const [usuarios, secretarias] = await Promise.all([listarUsuarios(), listarSecretarias()]);
  const ativas = secretarias.filter((s) => s.ativa);

  return (
    <PaginaSistema usuario={usuario} secretaria={secretaria} titulo="Usuários e perfis">
      <Cartao className="overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Usuários da prefeitura</caption>
          <thead className="border-b border-linha text-xs uppercase tracking-[0.04em] text-texto-suave">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">Nome</th>
              <th scope="col" className="px-4 py-3 font-medium">E-mail</th>
              <th scope="col" className="px-4 py-3 font-medium">Perfil</th>
              <th scope="col" className="px-4 py-3 font-medium">Situação</th>
              <th scope="col" className="px-4 py-3 font-medium"><span className="sr-only">Ações</span></th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.id} className="border-b border-linha last:border-0">
                <td className="px-4 py-3">{u.nome}</td>
                <td className="px-4 py-3 text-texto-suave">{u.email}</td>
                <td className="px-4 py-3">{PERFIS[u.perfil]}</td>
                <td className="px-4 py-3">
                  {!u.ativo ? "Bloqueado" : u.trocaSenha ? "Senha provisória" : "Ativo"}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/usuarios/${u.id}`} className="text-destaque underline-offset-2 hover:underline">
                    Editar<span className="sr-only"> {u.nome}</span>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Cartao>

      <Cartao>
        <h2 className="mb-4 text-lg">Cadastrar usuário</h2>
        <Formulario acao={cadastrarUsuario} botao="Cadastrar" enviando="Cadastrando…" className="max-w-md">
          <Campo rotulo="E-mail" name="email" type="email" autoComplete="off" required />
          <CamposUsuario secretarias={ativas} />
        </Formulario>
      </Cartao>
    </PaginaSistema>
  );
}
