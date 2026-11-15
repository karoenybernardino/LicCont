import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Cartao } from "@/ui/cartao";
import { Formulario } from "@/ui/formulario";
import { MolduraLogin } from "@/features/login/moldura";
import { usuarioAtual } from "@/features/sessao/dal";
import { aceiteEmDia } from "@/features/aceite/dados";
import { aceitarTextos } from "@/features/aceite/acoes";

export const metadata: Metadata = { title: "Aceite · LicCONT" };

// Primeiro acesso, e sempre que a versão dos textos mudar.
export default async function Aceite() {
  if (!(await usuarioAtual())) redirect("/entrar");
  if (await aceiteEmDia()) redirect("/inicio");
  return (
    <MolduraLogin>
      <Cartao>
        <Formulario acao={aceitarTextos} botao="Aceitar e continuar" enviando="Registrando…">
          <h1 className="text-xl">Política de privacidade e termo de uso</h1>
          <p className="-mt-2 text-[13px] text-texto-suave">
            Leia os textos antes de continuar. O aceite fica registrado com a data.
          </p>
          <p className="text-sm">
            <Link href="/privacidade" target="_blank" className="underline">Política de privacidade</Link>
            {" · "}
            <Link href="/termos" target="_blank" className="underline">Termo de uso</Link>
          </p>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" name="aceito" className="mt-1" />
            Li e aceito a política de privacidade e o termo de uso.
          </label>
        </Formulario>
      </Cartao>
    </MolduraLogin>
  );
}
