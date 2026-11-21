import type { ReactNode } from "react";
import { BotaoEnviar } from "@/ui/botao-enviar";
import { SeletorTema } from "@/ui/seletor-tema";
import { sair } from "@/features/sessao/acoes";
import { BarraLateral, type ItemMenu } from "@/features/sessao/barra-lateral";
import type { Eu } from "./dados";
import type { Resumo } from "./indicadores";
import { SeletorPrefeitura } from "./seletor";

const iniciais = (nome: string) => nome.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("");

// Menu da empresa parceira: dono vê Painel, Pesquisa, Mapa 3D, Etiquetas e Equipe; funcionário não vê Equipe.
export function menuParceira(papel: Eu["papel"]): ItemMenu[] {
  return [
    { href: "/parceira", rotulo: "Painel", dica: "Números das prefeituras que você atende.", icone: "painel" },
    { href: "/parceira/pesquisa", rotulo: "Pesquisa", dica: "Busca documentos nas prefeituras permitidas.", icone: "pesquisa" },
    { href: "/parceira/mapa", rotulo: "Mapa 3D", dica: "Mostra onde cada caixa está no arquivo.", icone: "mapa" },
    { href: "/parceira/etiquetas", rotulo: "Etiquetas", dica: "Caixas que ainda precisam de etiqueta.", icone: "etiquetas" },
    ...(papel === "dono" ? [{ href: "/parceira/equipe", rotulo: "Equipe", dica: "Pessoas da empresa e em quais prefeituras trabalham.", icone: "usuarios" as const }] : []),
  ];
}

// Moldura das telas da empresa parceira (quadros PartPainelDono, PartPainelFunc, PartEquipe...).
export function PaginaParceira({
  eu,
  titulo,
  prefeituras,
  atual,
  todas = false,
  children,
}: {
  eu: Eu;
  titulo: string;
  /** Prefeituras permitidas; sem a lista, não há seletor. */
  prefeituras?: Resumo[];
  atual?: string;
  /** Oferece "Todas as prefeituras" (dono) ou "Minhas prefeituras" (funcionário). */
  todas?: boolean;
  children: ReactNode;
}) {
  const opcoes = prefeituras
    ? [
        ...(todas ? [{ valor: "todas", texto: `${eu.papel === "dono" ? "Todas as prefeituras" : "Minhas prefeituras"} (${prefeituras.length})` }] : []),
        ...prefeituras.map((p) => ({ valor: p.id, texto: p.nome })),
      ]
    : [];
  return (
    <div data-moldura className="flex min-h-screen flex-1 gap-4 p-4 max-md:flex-col md:min-h-0 md:overflow-hidden dark:bg-black">
      <BarraLateral
        grupos={[menuParceira(eu.papel)]}
        rodape={[]}
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
        <header className="flex min-h-11 flex-wrap items-center justify-between gap-3 pr-4 pl-2">
          <div>
            <div className="text-xs text-texto-suave">
              {eu.parceiraNome} · {eu.papel === "dono" ? "Dono" : "Funcionário"}
            </div>
            <h1 className="font-titulo text-[21px] font-bold">{titulo}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            {atual !== undefined && opcoes.length > 0 && <SeletorPrefeitura opcoes={opcoes} atual={atual} rotulo="Prefeitura" />}
            <span className="hidden text-[13px] text-texto-suave sm:inline">{eu.nome}</span>
            <span aria-hidden title={eu.nome} className="flex size-9 items-center justify-center rounded-full bg-[#285a66] text-[13px] font-bold text-white">
              {iniciais(eu.nome)}
            </span>
            <SeletorTema />
          </div>
        </header>
        <main className="sc relative flex min-w-0 flex-1 flex-col gap-4 pr-2 md:min-h-0 md:overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
