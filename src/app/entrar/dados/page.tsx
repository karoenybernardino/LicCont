import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Campo } from "@/ui/campo";
import { Cartao } from "@/ui/cartao";
import { Formulario } from "@/ui/formulario";
import { Selecao } from "@/ui/selecao";
import { clientePublico } from "@/lib/supabase/servidor";
import { entrar } from "@/features/login/acoes";
import { idSchema } from "@/features/login/esquemas";
import { MolduraLogin } from "@/features/login/moldura";
import { COOKIE_PREFEITURA } from "@/features/sessao/cookies";

export const metadata: Metadata = { title: "Entrar · LicCONT" };

type Item = { id: string; nome: string };

// Tela 2 do login (canvas "Login"): secretaria, e-mail e senha.
export default async function DadosDeAcesso() {
  const id = idSchema.safeParse((await cookies()).get(COOKIE_PREFEITURA)?.value);
  const publico = clientePublico();
  if (!id.success || !publico) redirect("/entrar");

  const [{ data: prefeituras }, { data: secretarias }] = await Promise.all([
    publico.rpc("prefeituras_para_login"),
    publico.rpc("secretarias_para_login", { p_prefeitura: id.data }),
  ]);
  const prefeitura = (prefeituras as Item[] | null)?.find((p) => p.id === id.data);
  if (!prefeitura) redirect("/entrar");

  return (
    <MolduraLogin>
      <Cartao>
        <Formulario acao={entrar} botao="Entrar" enviando="Entrando…">
          <h1 className="text-xl">Entrar</h1>
          <div className="flex items-center justify-between gap-3 rounded-[10px] border border-linha bg-superficie-2 px-3.5 py-2.5 text-sm">
            <span>
              <span className="block text-[11px] uppercase tracking-[0.04em] text-texto-suave">Prefeitura</span>
              {prefeitura.nome}
            </span>
            <Link href="/entrar" className="text-[13px] text-destaque underline-offset-2 hover:underline">
              Trocar<span className="sr-only"> de prefeitura</span>
            </Link>
          </div>
          <Selecao
            rotulo="Secretaria"
            name="secretaria"
            required
            ajuda="Você verá só o acervo da secretaria escolhida."
          >
            {((secretarias ?? []) as Item[]).map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome}
              </option>
            ))}
            <option value="todas">Todas as secretarias</option>
          </Selecao>
          <Campo
            rotulo="E-mail"
            name="email"
            type="email"
            autoComplete="username"
            placeholder="nome@prefeitura.gov.br"
            required
          />
          <Campo
            rotulo="Senha"
            name="senha"
            type="password"
            autoComplete="current-password"
            placeholder="Sua senha"
            required
          />
          <details className="-mt-1.5 self-end text-right text-[13px]">
            <summary className="cursor-pointer text-destaque">Esqueci a senha</summary>
            <p className="mt-2 text-texto-suave">Peça ao administrador da sua prefeitura uma senha provisória.</p>
          </details>
        </Formulario>
      </Cartao>
    </MolduraLogin>
  );
}
