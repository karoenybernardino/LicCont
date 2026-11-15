import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Botao } from "@/ui/botao";
import { Cartao } from "@/ui/cartao";
import { Selecao } from "@/ui/selecao";
import { prefeiturasParaLogin } from "@/features/login/listas";
import { escolherPrefeitura } from "@/features/login/acoes";
import { Aviso, MolduraLogin } from "@/features/login/moldura";
import { Acoes, CartaoErro, LinkPrincipal, MolduraErro } from "@/features/sessao/erro";
import { COOKIE_PREFEITURA } from "@/features/sessao/cookies";

export const metadata: Metadata = { title: "Entrar · LicCONT" };

// Tela 1 do login (canvas "Login 1"): escolher a prefeitura.
export default async function EscolherPrefeitura({ searchParams }: PageProps<"/entrar">) {
  const { motivo } = await searchParams;
  // Tela "Sessão expirada" do canvas: no lugar do formulário.
  if (motivo === "inatividade") {
    return (
      <MolduraErro>
        <CartaoErro
          solo
          papel="status"
          icone="relogio"
          titulo="Sua sessão terminou"
          texto="Por segurança, o LicCONT sai sozinho depois de 30 minutos sem uso. Entre de novo para continuar de onde parou."
        >
          <Acoes>
            <LinkPrincipal href="/entrar" className="min-w-[200px]">
              Entrar de novo
            </LinkPrincipal>
          </Acoes>
        </CartaoErro>
      </MolduraErro>
    );
  }
  const lista = await prefeiturasParaLogin();
  const prefeituras = lista ?? [];
  const escolhida = (await cookies()).get(COOKIE_PREFEITURA)?.value;

  return (
    <MolduraLogin>
      <Cartao className="flex flex-col gap-[18px]">
        <h1 className="text-xl">Escolha a prefeitura</h1>
        {!lista ? (
          <Aviso>O login não está disponível nesta versão de teste (sem conexão com o banco).</Aviso>
        ) : prefeituras.length === 0 ? (
          <Aviso>Nenhuma prefeitura disponível no momento.</Aviso>
        ) : (
          <form action={escolherPrefeitura} className="flex flex-col gap-[18px]">
            <p className="-mt-2 text-[13px] text-texto-suave">Você entra no acervo da prefeitura escolhida.</p>
            <Selecao rotulo="Prefeitura" name="prefeitura" defaultValue={escolhida} required>
              {prefeituras.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </Selecao>
            <Botao type="submit" className="w-full">
              Continuar
            </Botao>
          </form>
        )}
      </Cartao>
    </MolduraLogin>
  );
}
