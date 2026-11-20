import type { Metadata } from "next";
import { Campo } from "@/ui/campo";
import { Cartao } from "@/ui/cartao";
import { Formulario } from "@/ui/formulario";
import { entrarParceira } from "@/features/login/acoes";
import { MolduraLogin } from "@/features/login/moldura";

export const metadata: Metadata = { title: "Empresa parceira · LicCONT" };

// Entrada da empresa parceira (dono e funcionários): sem prefeitura nem secretaria.
export default function EntrarParceira() {
  return (
    <MolduraLogin>
      <Cartao>
        <Formulario acao={entrarParceira} botao="Entrar" enviando="Entrando…">
          <h1 className="text-xl">Entrar · Empresa parceira</h1>
          <Campo rotulo="E-mail" name="email" type="email" autoComplete="username" required />
          <Campo rotulo="Senha" name="senha" type="password" autoComplete="current-password" required />
        </Formulario>
      </Cartao>
    </MolduraLogin>
  );
}
