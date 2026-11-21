import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Campo } from "@/ui/campo";
import { Cartao } from "@/ui/cartao";
import { Formulario } from "@/ui/formulario";
import { trocarSenhaParceira } from "@/features/login/acoes";
import { MolduraLogin } from "@/features/login/moldura";
import { euParceira } from "@/features/parceira/dados";
import { faltaSegundoFator } from "@/features/sessao/dal";

export const metadata: Metadata = { title: "Nova senha · LicCONT" };

// Primeiro acesso da empresa parceira: a senha provisória é trocada aqui.
export default async function NovaSenhaParceira() {
  const eu = await euParceira();
  if (!eu) redirect("/parceira/entrar");
  if (await faltaSegundoFator()) redirect("/segundo-fator");
  if (!eu.trocaSenha) redirect("/parceira");
  return (
    <MolduraLogin>
      <Cartao>
        <Formulario acao={trocarSenhaParceira} botao="Salvar senha" enviando="Salvando…">
          <h1 className="text-xl">Crie sua senha</h1>
          <p className="-mt-2 text-[13px] text-texto-suave">
            Sua senha atual é provisória. Use pelo menos 8 caracteres, com letra maiúscula, letra minúscula, número e símbolo.
          </p>
          <Campo rotulo="Nova senha" name="senha" type="password" autoComplete="new-password" required />
          <Campo rotulo="Repita a nova senha" name="confirmacao" type="password" autoComplete="new-password" required />
        </Formulario>
      </Cartao>
    </MolduraLogin>
  );
}
