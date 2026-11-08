import type { Metadata } from "next";
import { Campo } from "@/ui/campo";
import { Cartao } from "@/ui/cartao";
import { Formulario } from "@/ui/formulario";
import { entrarEquipe } from "@/features/login/acoes";
import { MolduraLogin } from "@/features/login/moldura";

export const metadata: Metadata = { title: "Equipe · LicCONT" };

// Entrada da equipe LicCONT: sem prefeitura nem secretaria.
export default function EntrarEquipe() {
  return (
    <MolduraLogin>
      <Cartao>
        <Formulario acao={entrarEquipe} botao="Entrar" enviando="Entrando…">
          <h1 className="text-xl">Entrar · Equipe LicCONT</h1>
          <Campo rotulo="E-mail" name="email" type="email" autoComplete="username" required />
          <Campo rotulo="Senha" name="senha" type="password" autoComplete="current-password" required />
        </Formulario>
      </Cartao>
    </MolduraLogin>
  );
}
