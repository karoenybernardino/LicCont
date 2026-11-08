import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Campo } from "@/ui/campo";
import { Cartao } from "@/ui/cartao";
import { Formulario } from "@/ui/formulario";
import { clienteSessao } from "@/lib/supabase/servidor";
import { verificarCodigo } from "@/features/dois-fatores/acoes";
import { CadastroAutenticador } from "@/features/dois-fatores/cadastro";
import { MolduraLogin } from "@/features/login/moldura";
import { membroEquipe, nivelSessao, usuarioAtual } from "@/features/sessao/dal";

export const metadata: Metadata = { title: "Segundo fator · LicCONT" };

// Administrador e equipe: código do aplicativo autenticador a cada login.
export default async function SegundoFator() {
  const usuario = await usuarioAtual();
  const equipe = usuario ? null : await membroEquipe();
  if (!usuario && !equipe) redirect("/entrar");
  if (usuario && !usuario.administrador) redirect("/inicio");
  if ((await nivelSessao()) === "aal2") redirect(!usuario ? "/equipe" : usuario.trocaSenha ? "/nova-senha" : "/inicio");

  const supabase = (await clienteSessao())!;
  const { data } = await supabase.auth.mfa.listFactors();
  const temAutenticador = !!data?.totp.length;

  return (
    <MolduraLogin>
      <Cartao className="flex flex-col gap-[18px]">
        <h1 className="text-xl">{temAutenticador ? "Código de acesso" : "Cadastre o autenticador"}</h1>
        {temAutenticador ? (
          <Formulario acao={verificarCodigo} botao="Confirmar" enviando="Confirmando…">
            <p className="-mt-2 text-[13px] text-texto-suave">
              Digite o código de 6 números do aplicativo autenticador.
            </p>
            <Campo
              rotulo="Código do aplicativo"
              name="codigo"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              required
            />
          </Formulario>
        ) : (
          <CadastroAutenticador />
        )}
      </Cartao>
    </MolduraLogin>
  );
}
