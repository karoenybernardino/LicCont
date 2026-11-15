import type { Metadata } from "next";
import Link from "next/link";
import { CartaoResumo, Pilula } from "@/ui/canvas";
import { PaginaEquipe } from "@/features/equipe/pagina";
import { Painel } from "@/features/estrutura/componentes";
import { Icone } from "@/features/sessao/barra-lateral";
import { acoesEquipe, integracoes, listarPedidos } from "@/features/equipe/dados";
import { SITUACOES_PEDIDO, haTempo, quando, textoAcao } from "@/features/equipe/textos";
import { listarPrefeituras } from "@/features/prefeituras/dados";
import { exigirEquipe } from "@/features/sessao/dal";

export const metadata: Metadata = { title: "Início da equipe · LicCONT" };

type Atencao = { id: string; titulo: string; texto: string; rotulo: string; tom: "erro" | "aviso"; href: string };

// Início da equipe LicCONT (quadro EquipeInicio): o que pede atenção hoje.
// Só números, datas e situações: nada do acervo.
export default async function InicioEquipe() {
  await exigirEquipe();
  const [prefeituras, integ, pedidos, acoes] = await Promise.all([
    listarPrefeituras(), integracoes(), listarPedidos(100), acoesEquipe({ limite: 4 }),
  ]);
  const ativas = prefeituras.filter((p) => p.status === "ativa").length;
  const comErro = prefeituras.filter((p) => integ.get(p.id)?.situacao === "erro");
  const semAdmin = prefeituras.filter((p) => p.administradores === 0);
  const novos = pedidos.filter((p) => p.situacao === "novo");
  const antigo = novos.at(-1);

  const atencao: Atencao[] = [
    ...comErro.map((p) => ({
      id: `tce-${p.id}`, titulo: `${p.nome} · TCE fora do ar`, rotulo: "Integração", tom: "erro" as const,
      texto: `Última rodada falhou ${quando(integ.get(p.id)?.ultimaEm ?? null)}. Tenta de novo à noite.`, href: `/equipe/prefeituras?sel=${p.id}`,
    })),
    ...semAdmin.map((p) => ({
      id: `adm-${p.id}`, titulo: p.nome, rotulo: "Pendência", tom: "aviso" as const,
      texto: "Sem administrador ativo.", href: `/equipe/${p.id}`,
    })),
    ...(antigo && !["hoje", "ontem"].includes(haTempo(antigo.criadoEm))
      ? [{ id: "pedido", titulo: "Pedido de demonstração sem resposta", rotulo: "Demonstração", tom: "aviso" as const,
          texto: `Chegou ${haTempo(antigo.criadoEm)}. ${antigo.orgao}.`, href: "/equipe/demonstracoes" }]
      : []),
  ];

  return (
    <PaginaEquipe titulo="Início">
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <CartaoResumo rotulo="Prefeituras ativas" valor={String(ativas)} legenda={`de ${prefeituras.length} cadastradas`} cor="teal" icone={<Icone nome="secretarias" />} />
        <CartaoResumo rotulo="Pedidos novos" valor={String(novos.length)} legenda="do formulário do site" cor="ambar" icone={<Icone nome="usuarios" />} />
        <CartaoResumo rotulo="Integrações com erro" valor={String(comErro.length)} legenda="TCE fora do ar na última rodada" cor="vermelho" icone={<Icone nome="importados" />} />
        <CartaoResumo rotulo="Pendências" valor={String(semAdmin.length)} legenda="prefeituras sem administrador ativo" cor="aco" icone={<Icone nome="auditoria" />} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Painel>
          <h2 className="text-[15px] font-bold">Precisa de atenção</h2>
          {atencao.length === 0 && <p className="text-sm text-texto-suave">Nada pendente agora.</p>}
          <ul className="flex flex-col gap-2.5">
            {atencao.map((a) => (
              <li key={a.id}>
                <Link href={a.href} className="flex items-center justify-between gap-3 border-b border-linha px-1 py-3 hover:bg-[#edf5f7] dark:hover:bg-[#0a181c]">
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{a.titulo}</span>
                    <span className="block text-[12.5px] text-texto-suave">{a.texto}</span>
                  </span>
                  <Pilula tom={a.tom}>{a.rotulo}</Pilula>
                </Link>
              </li>
            ))}
          </ul>
        </Painel>

        <div className="flex min-w-0 flex-col gap-4">
          <Painel>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[15px] font-bold">Pedidos de demonstração</h2>
              <Link href="/equipe/demonstracoes" className="text-[12.5px] text-destaque hover:underline">Ver todos</Link>
            </div>
            <ul className="flex flex-col divide-y divide-linha">
              {pedidos.slice(0, 4).map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{p.orgao}</span>
                    <span className="block truncate text-[12.5px] text-texto-suave">{p.cargo ?? "—"} · {haTempo(p.criadoEm)}</span>
                  </span>
                  <Pilula tom={p.situacao === "novo" ? "aviso" : "ok"}>{SITUACOES_PEDIDO[p.situacao]}</Pilula>
                </li>
              ))}
              {pedidos.length === 0 && <li className="py-2.5 text-sm text-texto-suave">Nenhum pedido ainda.</li>}
            </ul>
          </Painel>

          <Painel>
            <div className="flex items-center justify-between gap-3"><h2 className="text-[15px] font-bold">Últimas ações da equipe</h2><Link href="/equipe/auditoria" className="text-[12.5px] text-destaque hover:underline">Ver auditoria</Link></div>
            <ul className="flex flex-col divide-y divide-linha">
              {acoes.map((a) => (
                <li key={a.id} className="py-2.5">
                  <span className="block text-sm font-semibold">{textoAcao(a.acao, a.statusNovo)}{a.prefeitura ? ` · ${a.prefeitura}` : ""}</span>
                  <span className="block text-[12.5px] text-texto-suave">{a.quem} · {quando(a.criadoEm)}</span>
                </li>
              ))}
              {acoes.length === 0 && <li className="py-2.5 text-sm text-texto-suave">Nenhuma ação registrada.</li>}
            </ul>
          </Painel>
        </div>
      </div>
      <p className="text-[12.5px] text-texto-suave">A equipe LicCONT não vê o conteúdo do acervo: só quantidades, datas e situações.</p>
    </PaginaEquipe>
  );
}
