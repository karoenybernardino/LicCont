import type { Metadata } from "next";
import Link from "next/link";
import { CartaoResumo, Pilula, botaoContorno } from "@/ui/canvas";
import { BotaoEnviar } from "@/ui/botao-enviar";
import { PaginaEquipe } from "@/features/equipe/pagina";
import { Painel, TituloPainel, classeLinha, linhaCabecalho, td, th } from "@/features/estrutura/componentes";
import { Icone } from "@/features/sessao/barra-lateral";
import { importarPelaEquipe } from "@/features/equipe/acoes";
import { integracoes, lotesRecentes } from "@/features/equipe/dados";
import { codigoLote } from "@/features/equipe/exportar";
import { AVISOS_IMPORTAR, quando } from "@/features/equipe/textos";
import { listarPrefeituras } from "@/features/prefeituras/dados";
import { exigirEquipe } from "@/features/sessao/dal";

export const metadata: Metadata = { title: "Integrações · LicCONT" };

const SITUACAO_LOTE: Record<string, { rotulo: string; tom: "ok" | "aviso" | "erro" }> = {
  gravado: { rotulo: "Concluído", tom: "ok" },
  aberto: { rotulo: "Em andamento", tom: "aviso" },
  desfeito: { rotulo: "Desfeito", tom: "aviso" },
};

// Integrações da equipe (quadro EquipeIntegracoes): TCE-CE por prefeitura e lotes de importação.
export default async function Integracoes({ searchParams }: { searchParams: Promise<{ importou?: string }> }) {
  await exigirEquipe();
  const busca = await searchParams;
  const [prefeituras, integ, lotes] = await Promise.all([listarPrefeituras(), integracoes(), lotesRecentes(20)]);
  const ligadas = prefeituras.filter((p) => integ.get(p.id)?.ativo);
  const comErro = prefeituras.filter((p) => integ.get(p.id)?.situacao === "erro");
  const erros7d = [...integ.values()].reduce((t, i) => t + i.erros7d, 0);
  const ultima = [...integ.values()].map((i) => i.ultimaEm).filter((v): v is string => !!v).sort().at(-1) ?? null;
  const [diaUltima, horaUltima] = ultima ? quando(ultima).split(", ") : ["sem rodadas", "—"];
  const mes = new Date().toISOString().slice(0, 7);
  const lotesMes = lotes.filter((l) => l.criadoEm.startsWith(mes)).length;
  const aviso = busca.importou ? AVISOS_IMPORTAR[busca.importou] : undefined;

  return (
    <PaginaEquipe titulo="Integrações">
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <CartaoResumo rotulo="TCE-CE ligado" valor={String(ligadas.length)} legenda={`de ${prefeituras.length} prefeituras`} cor="teal" icone={<Icone nome="importados" />} />
        <CartaoResumo rotulo="Última rodada" valor={horaUltima} legenda={`${diaUltima} · ${comErro.length} ${comErro.length === 1 ? "prefeitura com erro" : "prefeituras com erro"}`} cor="aco" icone={<Icone nome="painel" />} />
        <CartaoResumo rotulo="Erros em 7 dias" valor={String(erros7d)} legenda="rodadas do TCE que falharam" cor="vermelho" icone={<Icone nome="auditoria" />} />
        <CartaoResumo rotulo="Lotes de importação" valor={String(lotesMes)} legenda="planilhas e PDFs, no mês" cor="ambar" icone={<Icone nome="cadastro" />} />
      </div>

      {aviso && <p role="status" className={`rounded-lg px-4 py-2.5 text-sm font-medium ${aviso.erro ? "bg-[#fee2e2] text-[#991b1b] dark:bg-[#3f1d1d] dark:text-[#fca5a5]" : "bg-[#ccfbf1] text-[#115e59] dark:bg-[#0e4a45] dark:text-[#7ff0df]"}`}>{aviso.texto}</p>}

      <Painel className="pb-1.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <TituloPainel>TCE-CE por prefeitura</TituloPainel>
            <p className="text-[12.5px] text-texto-suave">Busca automática toda noite, às 02:00.</p>
          </div>
          <Link href="/equipe/integracoes/historico" prefetch={false} className={botaoContorno}>Baixar histórico (CSV)</Link>
        </div>
        <div className="-mx-5 -mb-1.5 overflow-x-auto">
          <table className="w-full text-left">
            <caption className="sr-only">TCE-CE por prefeitura</caption>
            <thead>
              <tr className={linhaCabecalho}>
                <th scope="col" className={th}>Prefeitura</th>
                <th scope="col" className={th}>Situação</th>
                <th scope="col" className={th}>Última importação</th>
                <th scope="col" className={th}>Novos</th>
                <th scope="col" className={th}>Erros</th>
                <th scope="col" className={th}><span className="sr-only">Ações</span></th>
              </tr>
            </thead>
            <tbody>
              {prefeituras.map((p, n) => {
                const i = integ.get(p.id);
                const ativo = !!i?.ativo;
                return (
                  <tr key={p.id} className={classeLinha(false, n % 2 === 1)}>
                    <td className={`${td} w-full font-semibold`}>{p.nome}</td>
                    <td className={td}><Pilula tom={!ativo ? "aviso" : i?.situacao === "erro" ? "erro" : "ok"}>{!ativo ? "Desligada" : i?.situacao === "erro" ? "Com erro" : "Ligada"}</Pilula></td>
                    <td className={`${td} text-[13px]`}>{ativo ? quando(i?.ultimaEm ?? null) : "—"}</td>
                    <td className={`${td} font-mono text-[13px] font-medium`}>{ativo ? (i?.novos ?? 0) : "—"}</td>
                    <td className={`${td} font-mono text-[13px] font-medium`}>{ativo ? (i?.erros7d ?? 0) : "—"}</td>
                    <td className={`${td} text-right`}>
                      {ativo && (
                        <form action={importarPelaEquipe}>
                          <input type="hidden" name="id" value={p.id} />
                          <input type="hidden" name="volta" value="integracoes" />
                          <BotaoEnviar className={botaoContorno}>Importar agora</BotaoEnviar>
                        </form>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Painel>

      <Painel className="pb-1.5">
        <div>
          <TituloPainel>Lotes de importação</TituloPainel>
          <p className="text-[12.5px] text-texto-suave">Planilha e PDFs enviados pelas prefeituras. Só números e datas.</p>
        </div>
        <div className="-mx-5 -mb-1.5 overflow-x-auto">
          <table className="w-full text-left">
            <caption className="sr-only">Lotes de importação recentes</caption>
            <thead>
              <tr className={linhaCabecalho}>
                <th scope="col" className={th}>Lote</th>
                <th scope="col" className={th}>Prefeitura</th>
                <th scope="col" className={th}>Linhas</th>
                <th scope="col" className={th}>Situação</th>
                <th scope="col" className={th}>Quando</th>
              </tr>
            </thead>
            <tbody>
              {lotes.map((l, n) => {
                const s = l.situacao === "gravado" && l.pulados > 0 ? { rotulo: "Com problemas", tom: "aviso" as const } : (SITUACAO_LOTE[l.situacao] ?? SITUACAO_LOTE.aberto);
                return (
                  <tr key={l.id} className={classeLinha(false, n % 2 === 1)}>
                    <td className={`${td} font-mono text-[13px] font-medium`}>{codigoLote(l.criadoEm, l.id)}</td>
                    <td className={`${td} w-full`}>{l.prefeitura}</td>
                    <td className={`${td} font-mono text-[13px] font-medium`}>{l.linhas.toLocaleString("pt-BR")}</td>
                    <td className={td}><Pilula tom={s.tom}>{s.rotulo}</Pilula></td>
                    <td className={`${td} text-[13px]`}>{quando(l.criadoEm)}</td>
                  </tr>
                );
              })}
              {lotes.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-sm text-texto-suave">Nenhum lote ainda.</td></tr>}
            </tbody>
          </table>
        </div>
      </Painel>
      <p className="text-[12.5px] text-texto-suave">A equipe LicCONT não vê o conteúdo dos registros. Os erros mostram só números e datas, nunca nome, CNPJ ou objeto.</p>
    </PaginaEquipe>
  );
}
