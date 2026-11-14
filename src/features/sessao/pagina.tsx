import type { ReactNode } from "react";
import { BotaoEnviar } from "@/ui/botao-enviar";
import { SeletorTema } from "@/ui/seletor-tema";
import { sair } from "./acoes";
import { BarraLateral, Icone, type ItemMenu } from "./barra-lateral";
import { podeCadastrar } from "@/features/documentos/dados";
import { nomePrefeitura, type Secretaria, type Usuario } from "./dal";
import { SeletorSecretaria } from "./seletor-secretaria";

// Menu do canvas: Pesquisa, Mapa 3D, Cadastro, Empréstimos, Temporalidade e Auditoria
// em cima; o que o sistema tem a mais (Início, Estrutura, Usuários, Secretarias) fica
// embaixo, antes de Configurações e Sair. Sem "href": tela de fase futura, apagada.
const PRINCIPAIS: ItemMenu[] = [
  { href: "/pesquisa", rotulo: "Pesquisa", icone: "pesquisa", prefixos: ["/documentos/"] },
  { href: "/mapa", rotulo: "Mapa 3D", icone: "mapa" },
  { rotulo: "Empréstimos", icone: "emprestimos" },
  { rotulo: "Temporalidade", icone: "temporalidade" },
  { rotulo: "Auditoria", icone: "auditoria" },
];
const CADASTRO: ItemMenu = { href: "/documentos/novo", rotulo: "Cadastrar documento", icone: "cadastro" };
const EXTRAS: ItemMenu[] = [
  { href: "/inicio", rotulo: "Início", icone: "inicio" },
  { href: "/estrutura", rotulo: "Estrutura física", icone: "estrutura" },
];
const ADMIN: ItemMenu[] = [
  { href: "/usuarios", rotulo: "Usuários e perfis", icone: "usuarios" },
  { href: "/secretarias", rotulo: "Secretarias", icone: "secretarias" },
];
const CONFIG: ItemMenu = { rotulo: "Configurações", icone: "configuracoes" };

function iniciais(nome: string) {
  return nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

// Moldura das telas do sistema, como no canvas: barra lateral de ícones,
// linha de título (trilha + h1) com secretaria, prefeitura e iniciais, e o conteúdo.
export async function PaginaSistema({
  usuario,
  secretaria,
  titulo,
  trilha,
  acoes,
  children,
}: {
  usuario: Usuario;
  secretaria: Secretaria;
  titulo: string;
  trilha?: ReactNode;
  acoes?: ReactNode;
  /** Mantido por compatibilidade: todas as telas usam a largura inteira do canvas. */
  larga?: boolean;
  children: ReactNode;
}) {
  const prefeitura = await nomePrefeitura(usuario);
  // Cadastrar só aparece para quem cadastra (o servidor também confere).
  const principais = (await podeCadastrar(usuario))
    ? [...PRINCIPAIS.slice(0, 2), CADASTRO, ...PRINCIPAIS.slice(2)]
    : PRINCIPAIS;
  const admin = [...EXTRAS, ...(usuario.administrador ? ADMIN : []), CONFIG];
  return (
    <div data-moldura className="flex min-h-screen flex-1 gap-4 p-4 max-md:flex-col md:min-h-0 md:overflow-hidden dark:bg-black">
      <BarraLateral
        principais={principais}
        admin={admin}
        sair={
          <form action={sair}>
            <BotaoEnviar
              aria-label="Sair"
              title="Sair"
              className="flex size-11 items-center justify-center rounded-full text-[#8cc5cf] hover:shadow-[0_0_0_1.5px_var(--marca-aqua)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aqua"
            >
              <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 4H5v16h4M16 8l4 4-4 4M20 12H9" />
              </svg>
            </BotaoEnviar>
          </form>
        }
      />
      <div className="flex min-w-0 flex-1 flex-col gap-4 md:min-h-0">
        <header className="flex min-h-11 flex-wrap items-center justify-between gap-3 pt-1 pr-4 pl-2">
          <div>
            <h1 className="font-titulo text-[22px] font-bold">{titulo}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            {acoes}
            <SeletorSecretaria usuario={usuario} atual={secretaria} />
            <span className="hidden text-[13px] text-texto-suave sm:inline dark:text-[#9bb8bf]">{prefeitura}</span>
            <span
              aria-hidden
              title={usuario.nome}
              className="flex size-9 items-center justify-center rounded-full bg-[#285a66] text-[13px] font-bold text-white"
            >
              {iniciais(usuario.nome)}
            </span>
            <SeletorTema />
          </div>
        </header>
        <main className="sc flex min-w-0 flex-1 flex-col gap-4 pr-2 md:min-h-0 md:overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

export { Icone };
