import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Cartao } from "@/ui/cartao";
import { Formulario } from "@/ui/formulario";
import { idSchema } from "@/features/login/esquemas";
import { exigirAdmin } from "@/features/sessao/dal";
import { PaginaSistema } from "@/features/sessao/pagina";
import { alternarBloqueio, encerrarSessoes, redefinirSenha, salvarUsuario } from "@/features/usuarios/acoes";
import { CamposUsuario } from "@/features/usuarios/campos";
import { listarSecretarias, listarUsuarios } from "@/features/usuarios/dados";

export const metadata: Metadata = { title: "Editar usuário · LicCONT" };

export default async function EditarUsuario({ params }: PageProps<"/usuarios/[id]">) {
  const { usuario, secretaria } = await exigirAdmin();
  const id = idSchema.safeParse((await params).id);
  if (!id.success) notFound();
  const [[alvo], secretarias] = await Promise.all([listarUsuarios(id.data), listarSecretarias()]);
  if (!alvo) notFound();
  const proprio = alvo.id === usuario.id;
  // Secretaria desativada continua na lista se a pessoa ainda tiver vínculo.
  const opcoes = secretarias.filter((s) => s.ativa || alvo.secretarias.includes(s.id));

  return (
    <PaginaSistema usuario={usuario} secretaria={secretaria} titulo={alvo.nome}>
      <p className="-mt-4 text-sm text-texto-suave">
        {alvo.email} · <Link href="/usuarios" className="text-destaque underline-offset-2 hover:underline">Voltar para usuários</Link>
      </p>

      <Cartao>
        <h2 className="mb-4 text-lg">Dados e perfil</h2>
        <Formulario acao={salvarUsuario} botao="Salvar" enviando="Salvando…" className="max-w-md">
          <input type="hidden" name="id" value={alvo.id} />
          <CamposUsuario secretarias={opcoes} inicial={alvo} perfilTravado={proprio} />
        </Formulario>
      </Cartao>

      {!proprio && (
        <div className="grid gap-6 sm:grid-cols-3">
          <Cartao className="flex flex-col gap-3">
            <h2 className="text-lg">{alvo.ativo ? "Bloquear" : "Desbloquear"}</h2>
            <p className="text-sm text-texto-suave">
              {alvo.ativo ? "A pessoa perde o acesso na hora." : "A pessoa volta a entrar com a senha dela."}
            </p>
            <Formulario
              acao={alternarBloqueio}
              botao={alvo.ativo ? "Bloquear usuário" : "Desbloquear usuário"}
              enviando="Salvando…"
              variante="secundario"
            >
              <input type="hidden" name="id" value={alvo.id} />
              <input type="hidden" name="bloquear" value={alvo.ativo ? "sim" : "nao"} />
            </Formulario>
          </Cartao>
          <Cartao className="flex flex-col gap-3">
            <h2 className="text-lg">Redefinir senha</h2>
            <p className="text-sm text-texto-suave">Gera uma senha provisória nova e encerra as sessões.</p>
            <Formulario acao={redefinirSenha} botao="Redefinir senha" enviando="Gerando…" variante="secundario">
              <input type="hidden" name="id" value={alvo.id} />
            </Formulario>
          </Cartao>
          <Cartao className="flex flex-col gap-3">
            <h2 className="text-lg">Encerrar sessões</h2>
            <p className="text-sm text-texto-suave">Desconecta a pessoa de todos os aparelhos.</p>
            <Formulario acao={encerrarSessoes} botao="Encerrar sessões" enviando="Encerrando…" variante="secundario">
              <input type="hidden" name="id" value={alvo.id} />
            </Formulario>
          </Cartao>
        </div>
      )}
    </PaginaSistema>
  );
}
