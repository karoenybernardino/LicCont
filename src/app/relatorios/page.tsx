import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { botaoContorno, botaoPrimario } from "@/ui/canvas";
import { Painel, TituloPainel } from "@/features/estrutura/componentes";
import { exigirSessao, secretariasPermitidas } from "@/features/sessao/dal";
import { PaginaSistema } from "@/features/sessao/pagina";
import { secretariasParaCadastro } from "@/features/documentos/dados";
import { IDS_RELATORIO, RELATORIOS, lerPedido, type IdRelatorio } from "@/features/relatorios/definicoes";
import { montarRelatorio } from "@/features/relatorios/dados";

export const metadata: Metadata = { title: "Relatórios · LicCONT" };

export default async function RelatoriosPagina({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { usuario, secretaria } = await exigirSessao();
  // Consulta não exporta: sem secretaria para cadastrar e sem ser administrador, volta à pesquisa.
  if (!usuario.administrador && (await secretariasParaCadastro(usuario)).length === 0) redirect("/pesquisa");
  const secretarias = (await secretariasPermitidas(usuario)).filter((s): s is { id: string; nome: string } => s.id !== null);
  const nomes = new Map(secretarias.map((s) => [s.id, s.nome]));
  const bruta = await searchParams;
  const params = new URLSearchParams(Object.entries(bruta).flatMap(([k, v]) => (typeof v === "string" ? [[k, v]] : [])));
  const { id: pedido, filtros } = lerPedido(params);
  const id: IdRelatorio = pedido ?? "inventario";
  const def = RELATORIOS[id];
  const filtro = { ...filtros, secretaria: filtros.secretaria && nomes.has(filtros.secretaria) ? filtros.secretaria : null };
  const previa = await montarRelatorio(id, filtro, nomes);

  const q = new URLSearchParams({ relatorio: id });
  if (filtro.secretaria) q.set("secretaria", filtro.secretaria);
  if (def.periodo && filtro.de) q.set("de", filtro.de);
  if (def.periodo && filtro.ate) q.set("ate", filtro.ate);

  return (
    <PaginaSistema usuario={usuario} secretaria={secretaria} titulo="Relatórios" trilha="Acervo · Gerenciais">
      <div className="grid items-start gap-4 xl:grid-cols-[320px_1fr]">
        <Painel>
          <TituloPainel>Relatórios</TituloPainel>
          <ul>
            {IDS_RELATORIO.map((k) => (
              <li key={k}>
                <Link
                  href={`/relatorios?relatorio=${k}`}
                  aria-current={k === id ? "page" : undefined}
                  className={`block border-t border-linha px-2 py-3 ${k === id ? "bg-destaque/10" : ""}`}
                >
                  <span className="block text-sm font-medium">{RELATORIOS[k].nome}</span>
                  <span className="block text-xs text-texto-suave">{RELATORIOS[k].descricao}</span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="text-xs text-texto-suave">Cada relatório baixado fica registrado na auditoria.</p>
        </Painel>

        <Painel>
          <TituloPainel>{def.nome}</TituloPainel>
          <p className="text-sm text-texto-suave">{def.descricao}</p>
          <form action="/relatorios" className="flex flex-wrap items-end gap-3 text-sm">
            <input type="hidden" name="relatorio" value={id} />
            {def.periodo && (
              <>
                <label className="flex flex-col gap-1">
                  De
                  <input type="date" name="de" defaultValue={filtro.de ?? ""} className="min-h-10 rounded-lg border border-linha bg-campo px-3" />
                </label>
                <label className="flex flex-col gap-1">
                  Até
                  <input type="date" name="ate" defaultValue={filtro.ate ?? ""} className="min-h-10 rounded-lg border border-linha bg-campo px-3" />
                </label>
              </>
            )}
            <label className="flex flex-col gap-1">
              Secretaria
              <select name="secretaria" defaultValue={filtro.secretaria ?? ""} className="min-h-10 rounded-lg border border-linha bg-campo px-3">
                <option value="">Todas as secretarias</option>
                {secretarias.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nome}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className={botaoContorno}>
              Atualizar prévia
            </button>
          </form>

          <section aria-label="Prévia da 1ª página" className="rounded-xl border border-linha p-4">
            <p className="text-xs text-texto-suave">Prévia da 1ª página</p>
            <h3 className="font-titulo text-base font-semibold">{previa.titulo}</h3>
            <p className="mb-2 text-xs text-texto-suave">{previa.linhasDeCabecalho.join(" · ")}</p>
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="text-left">
                  {previa.colunas.map((c) => (
                    <th key={c} className="px-1.5 py-1 font-semibold uppercase">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previa.linhas.slice(0, 8).map((l, i) => (
                  <tr key={i} className="border-t border-linha">
                    {l.map((c, j) => (
                      <td key={j} className="px-1.5 py-1">
                        {c}
                      </td>
                    ))}
                  </tr>
                ))}
                {!previa.linhas.length && (
                  <tr>
                    <td colSpan={previa.colunas.length} className="px-1.5 py-4 text-center text-texto-suave">
                      Nenhum registro para os filtros escolhidos.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>

          <div className="flex flex-wrap gap-3">
            <a className={botaoContorno} href={`/relatorios/baixar?${q}&formato=planilha`}>
              Baixar planilha
            </a>
            <a className={botaoPrimario} href={`/relatorios/baixar?${q}&formato=pdf`}>
              Baixar PDF
            </a>
          </div>
        </Painel>
      </div>
    </PaginaSistema>
  );
}
