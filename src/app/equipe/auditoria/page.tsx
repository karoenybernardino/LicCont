import type { Metadata } from "next";
import Link from "next/link";
import { Filtros, botaoPrimario } from "@/ui/canvas";
import { PaginaEquipe } from "@/features/equipe/pagina";
import { Painel, classeLinha, linhaCabecalho, td, th } from "@/features/estrutura/componentes";
import { acoesEquipe } from "@/features/equipe/dados";
import { aplicarFiltroAcao, lerFiltrosAuditoria } from "@/features/equipe/exportar";
import { formatarDiaHora, textoAcao } from "@/features/equipe/textos";
import { listarPrefeituras } from "@/features/prefeituras/dados";
import { exigirEquipe } from "@/features/sessao/dal";

export const metadata: Metadata = { title: "Auditoria da equipe · LicCONT" };

const seletor = "min-h-10 rounded-lg border border-linha bg-transparent px-3 text-sm";

// Auditoria da equipe (quadro EquipeAuditoria): quem, quando, o quê e em qual prefeitura.
export default async function AuditoriaEquipe({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await exigirEquipe();
  const busca = await searchParams;
  const params = new URLSearchParams(Object.entries(busca).filter((e): e is [string, string] => typeof e[1] === "string"));
  const f = lerFiltrosAuditoria(params);
  const [prefeituras, todas] = await Promise.all([listarPrefeituras(), acoesEquipe({ dias: f.dias, prefeitura: f.prefeitura, limite: 500 })]);
  const opcoes = [...new Set(todas.map((a) => textoAcao(a.acao, a.statusNovo)))].sort();
  const acoes = aplicarFiltroAcao(todas, f.acao);
  const url = (extra: Record<string, string | null>, base = "/equipe/auditoria") => {
    const q = new URLSearchParams({ ...(f.dias && { dias: String(f.dias) }), ...(f.prefeitura && { prefeitura: f.prefeitura }), ...(f.acao && { acao: f.acao }) });
    for (const [k, v] of Object.entries(extra)) {
      if (v === null) q.delete(k);
      else q.set(k, v);
    }
    return q.size ? `${base}?${q}` : base;
  };

  return (
    <PaginaEquipe titulo="Auditoria da equipe">
      <Painel>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold">Ações da equipe LicCONT</h2>
            <p className="text-[12.5px] text-texto-suave">Quem fez o quê nas prefeituras, com data e hora.</p>
          </div>
          <Link href={url({}, "/equipe/auditoria/pdf")} prefetch={false} className={botaoPrimario}>Exportar (PDF)</Link>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <Filtros itens={[
            { href: url({ dias: "7" }), rotulo: "7 dias", ativo: f.dias === 7 },
            { href: url({ dias: "30" }), rotulo: "30 dias", ativo: f.dias === 30 },
            { href: url({ dias: null }), rotulo: "Tudo", ativo: f.dias === null },
          ]} />
          <form action="/equipe/auditoria" className="flex flex-wrap items-end gap-3">
            {f.dias && <input type="hidden" name="dias" value={f.dias} />}
            <label className="flex flex-col gap-1 text-[12.5px] text-texto-suave">Prefeitura
              <select name="prefeitura" defaultValue={f.prefeitura ?? ""} className={seletor}>
                <option value="">Todas</option>
                {prefeituras.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-[12.5px] text-texto-suave">Ação
              <select name="acao" defaultValue={f.acao ?? ""} className={seletor}>
                <option value="">Todas as ações</option>
                {opcoes.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </label>
            <button type="submit" className="min-h-10 rounded-lg border border-linha px-4 text-sm hover:border-destaque">Filtrar</button>
          </form>
        </div>
        <div className="-mx-5 -mb-1.5 overflow-x-auto">
          <table className="w-full text-left">
            <caption className="sr-only">Ações da equipe LicCONT</caption>
            <thead>
              <tr className={linhaCabecalho}>
                <th scope="col" className={th}>Quando</th>
                <th scope="col" className={th}>Quem</th>
                <th scope="col" className={th}>Ação</th>
                <th scope="col" className={th}>Prefeitura</th>
                <th scope="col" className={th}>Origem (IP)</th>
              </tr>
            </thead>
            <tbody>
              {acoes.map((a, n) => (
                <tr key={a.id} className={classeLinha(false, n % 2 === 1)}>
                  <td className={`${td} font-mono text-[13px] font-medium`}>{formatarDiaHora(a.criadoEm)}</td>
                  <td className={td}>{a.quem}</td>
                  <td className={`${td} w-full`}>{textoAcao(a.acao, a.statusNovo)}</td>
                  <td className={td}>{a.prefeitura ?? "—"}</td>
                  <td className={`${td} font-mono text-[13px]`}>{a.ip ?? "—"}</td>
                </tr>
              ))}
              {acoes.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-sm text-texto-suave">Nenhuma ação encontrada.</td></tr>}
            </tbody>
          </table>
        </div>
      </Painel>
      <p className="text-[12.5px] text-texto-suave">Esta auditoria <b>não guarda o conteúdo dos documentos</b>, só quem, quando, o quê e em qual prefeitura. O IP é dado pessoal: use só para o trabalho.</p>
    </PaginaEquipe>
  );
}
