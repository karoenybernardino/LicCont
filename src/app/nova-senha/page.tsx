import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Campo } from "@/ui/campo";
import { Cartao } from "@/ui/cartao";
import { Formulario } from "@/ui/formulario";
import { trocarSenha } from "@/features/login/acoes";
import { MolduraLogin } from "@/features/login/moldura";
import { nivelSessao, usuarioAtual } from "@/features/sessao/dal";

export const metadata: Metadata = { title: "Nova senha · LicCONT" };

// Primeiro acesso e depois de "Redefinir senha": a senha provisória é trocada aqui.
export default async function NovaSenha() {
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/entrar");
  if (!usuario.trocaSenha) redirect("/inicio");
  if (usuario.administrador && (await nivelSessao()) !== "aal2") redirect("/segundo-fator");

  return (
    <MolduraLogin>
      <Cartao>
        <Formulario acao={trocarSenha} botao="Salvar senha" enviando="Salvando…">
          <h1 className="text-xl">Crie sua senha</h1>
          <p className="-mt-2 text-[13px] text-texto-suave">
            Sua senha atual é provisória. Use pelo menos 12 caracteres e não repita senhas de outros sites.
          </p>
          <Campo
            rotulo="Nova senha"
            name="senha"
            type="password"
            autoComplete="new-password"
            required
          />
          <Campo
            rotulo="Repita a nova senha"
            name="confirmacao"
            type="password"
            autoComplete="new-password"
            required
          />
        </Formulario>
      </Cartao>
    </MolduraLogin>
  );
}
