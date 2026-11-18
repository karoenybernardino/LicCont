import type { ReactNode } from "react";
import { BotaoEnviar } from "@/ui/botao-enviar";
import { SeletorTema } from "@/ui/seletor-tema";
import { sair } from "./acoes";
import { BarraLateral, Icone, type ItemMenu } from "./barra-lateral";
import { podeCadastrar, secretariasParaCadastro } from "@/features/documentos/dados";
import { ehCoordenador } from "@/features/estrutura/dados";
import { contarFila } from "@/features/tce/dados";
import { nomePrefeitura, type Secretaria, type Usuario } from "./dal";
import { SeletorSecretaria } from "./seletor-secretaria";

// Menu em grupos, separados por um traço: Início; Acervo (o dia a dia dos documentos);
// Gestão (acompanhar e conferir); Administração (só administrador). Configurações e
// Sair ficam no rodapé. Sem "href": tela de fase futura, apagada, "em breve".
const INICIO: ItemMenu = { href: "/inicio", rotulo: "Início", dica: "Resumo do que precisa de atenção hoje.", icone: "inicio" };
const ACERVO: ItemMenu[] = [
  { href: "/pesquisa", rotulo: "Pesquisa", dica: "Busca documentos por número, assunto ou texto.", icone: "pesquisa", prefixos: ["/documentos/"] },
  { href: "/mapa", rotulo: "Mapa 3D", dica: "Mostra onde cada caixa está no arquivo.", icone: "mapa" },
  { href: "/emprestimos", rotulo: "Empréstimos", dica: "Controla retiradas e devoluções de documentos.", icone: "emprestimos" },
  { href: "/temporalidade", rotulo: "Temporalidade", dica: "Prazos de guarda e eliminação de documentos.", icone: "temporalidade" },
];
const CADASTRO: ItemMenu = { href: "/documentos/novo", rotulo: "Cadastrar documento", dica: "Registra um documento novo no acervo.", icone: "cadastro" };
const ETIQUETAS: ItemMenu = { href: "/etiquetas", rotulo: "Etiquetas", dica: "Imprime etiquetas de caixa e documento com QR.", icone: "etiquetas" };
const PAINEL: ItemMenu = { href: "/painel", rotulo: "Painel", dica: "Números do acervo em gráficos.", icone: "painel" };
const AUDITORIA: ItemMenu = { rotulo: "Auditoria", dica: "Histórico de quem fez o quê.", icone: "auditoria" };
const ESTRUTURA: ItemMenu = { href: "/estrutura", rotulo: "Estrutura física", dica: "Galpões, ruas e módulos de caixas.", icone: "estrutura" };
// Tudo que o administrador ajusta fica dentro de Configurações (submenu ao lado da barra).
export const AJUSTES: ItemMenu[] = [
  { href: "/usuarios", rotulo: "Usuários e perfis", dica: "Quem acessa o sistema e com qual perfil.", icone: "usuarios" },
  { href: "/secretarias", rotulo: "Secretarias", dica: "Cadastro das secretarias da prefeitura.", icone: "secretarias" },
  { href: "/configuracoes/grupos", rotulo: "Grupos documentais", dica: "Grupos, tipologias e quem vê cada grupo.", icone: "secretarias" },
  { href: "/estrutura", rotulo: "Estrutura física", dica: "Galpões, ruas e módulos de caixas.", icone: "estrutura" },
  { href: "/configuracoes/tce", rotulo: "Importação do TCE", dica: "Liga e acompanha a importação do TCE-CE.", icone: "importados" },
  { href: "/configuracoes/suporte", rotulo: "Acesso de suporte", dica: "Libera ou encerra o acesso da equipe LicCONT.", icone: "configuracoes" },
  { href: "/configuracoes/exportar", rotulo: "Exportar dados", dica: "Baixa uma cópia dos dados da prefeitura.", icone: "relatorios" },
];
const CONFIG: ItemMenu = { rotulo: "Configurações", dica: "Usuários, secretarias, suporte e exportação.", icone: "configuracoes" };

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
  const cadastra = await podeCadastrar(usuario);
  // Importados do TCE: quem confere (administrador ou coordenador), com a contagem da fila.
  // Relatórios: quem exporta (administrador ou quem cadastra).
  const confere = usuario.administrador || (await ehCoordenador(usuario));
  const exporta = usuario.administrador || (await secretariasParaCadastro(usuario)).length > 0;
  const gestao: ItemMenu[] = [
    PAINEL,
    ...(confere ? [{ href: "/importados", rotulo: "Importados do TCE", dica: "Documentos vindos do TCE-CE para conferir.", icone: "importados" as const, prefixos: ["/importados"], contagem: await contarFila() }] : []),
    ...(exporta ? [{ href: "/relatorios", rotulo: "Relatórios", dica: "Relatórios do acervo para imprimir ou baixar.", icone: "relatorios" as const }] : []),
    // Auditoria: só o administrador lê (RLS); para os outros fica apagada, em breve.
    usuario.administrador ? { ...AUDITORIA, href: "/auditoria" } : AUDITORIA,
    // Administrador acha a estrutura em Configurações; os demais seguem com o item solto.
    ...(usuario.administrador ? [] : [ESTRUTURA]),
  ];
  const grupos = [[INICIO], [...ACERVO.slice(0, 2), ...(cadastra ? [CADASTRO, ETIQUETAS] : []), ...ACERVO.slice(2)], gestao];
  return (
    <div data-moldura className="flex min-h-screen flex-1 gap-4 p-4 max-md:flex-col md:min-h-0 md:overflow-hidden dark:bg-black">
      <BarraLateral
        grupos={grupos}
        rodape={[usuario.administrador ? { ...CONFIG, filhos: AJUSTES } : CONFIG]}
        sair={
          <form action={sair}>
            <BotaoEnviar
              aria-label="Sair"
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
            {trilha && <div className="text-xs text-texto-suave">{trilha}</div>}
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
