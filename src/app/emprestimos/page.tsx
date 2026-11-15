import type { Metadata } from "next";
import { Busca, CabecalhoPainel, Filtros, Pilula } from "@/ui/canvas";
import { Painel, classeLinha, linhaCabecalho, td, th } from "@/features/estrutura/componentes";
import { exigirSessao } from "@/features/sessao/dal";
import { PaginaSistema } from "@/features/sessao/pagina";
import { contarEmprestimos, listarEmprestimos } from "@/features/movimento/dados";
import { dataBR, situacaoEmprestimo } from "@/features/movimento/situacao";
import { BotaoBreve, CampoRotulado, LinhaVazia, campo } from "@/features/movimento/ui";

export const metadata: Metadata = { title: "Empréstimos · LicCONT" };

const ABAS = ["abertos", "atrasados", "devolvidos"] as const;
type Aba = (typeof ABAS)[number];

const desativado = { disabled: true, "aria-disabled": true, title: "Em breve", className: campo } as const;

export default async function Emprestimos({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { usuario, secretaria } = await exigirSessao();
  const p = await searchParams;
  const um = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");
  const aba: Aba = (ABAS as readonly string[]).includes(um(p.situacao)) ? (um(p.situacao) as Aba) : "abertos";
  const q = um(p.q).trim().slice(0, 100);

  const todos = await listarEmprestimos();
  const { abertos, atrasados } = contarEmprestimos(todos);
  const busca = q.toLowerCase();
  const linhas = todos
    .filter((e) => (aba === "devolvidos" ? e.devolvido : !e.devolvido && (aba === "abertos" || situacaoEmprestimo(e.prazo).atrasado)))
    .filter((e) => !busca || [e.titulo, e.objeto, e.quem, e.setor].some((t) => t.toLowerCase().includes(busca)));

  const href = (a: Aba) => {
    const params = new URLSearchParams();
    if (a !== "abertos") params.set("situacao", a);
    if (q) params.set("q", q);
    return `/emprestimos${params.size ? `?${params}` : ""}`;
  };
  const colunas = ["Documento", "Caixa", "Retirado por", "Prazo", "Situação", ""];

  return (
    <PaginaSistema usuario={usuario} secretaria={secretaria} titulo="Empréstimos e devoluções" trilha="Acervo · Movimentação" acoes={<BotaoBreve>Exportar lista</BotaoBreve>}>
      <div className="grid items-start gap-4 xl:grid-cols-[1fr_340px]">
        <Painel className="pb-1.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Filtros
              itens={[
                { href: href("abertos"), rotulo: `Em aberto · ${abertos}`, ativo: aba === "abertos" },
                { href: href("atrasados"), rotulo: `Atrasados · ${atrasados}`, ativo: aba === "atrasados" },
                { href: href("devolvidos"), rotulo: "Devolvidos", ativo: aba === "devolvidos" },
              ]}
            />
            <div className="flex w-[240px]">
              <Busca acao="/emprestimos" valor={q} rotulo="Buscar empréstimo" marcador="Documento ou pessoa" extra={aba !== "abertos" ? { situacao: aba } : undefined} />
            </div>
          </div>
          <div className="sc -mx-5 max-h-[420px] overflow-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className={linhaCabecalho}>
                  {colunas.map((c, i) => (
                    <th key={i} scope="col" className={th}>
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {linhas.length === 0 && <LinhaVazia colunas={colunas.length}>Nenhum empréstimo registrado.</LinhaVazia>}
                {linhas.map((e, i) => {
                  const s = e.devolvido ? null : situacaoEmprestimo(e.prazo);
                  return (
                    <tr key={e.id} className={classeLinha(false, i % 2 === 1)}>
                      <td className={`${td} h-auto py-3`}>
                        <span className="block font-semibold">{e.titulo}</span>
                        <span className="block text-xs text-texto-suave">{e.objeto}</span>
                      </td>
                      <td className={`${td} font-mono text-xs font-medium`}>{e.caixa}</td>
                      <td className={td}>
                        <span className="block">{e.quem}</span>
                        <span className="block text-xs text-texto-suave">{e.setor}</span>
                      </td>
                      <td className={`${td} text-[13px]`}>{dataBR(e.prazo)}</td>
                      <td className={td}>{s ? <Pilula tom={s.tom}>{s.texto}</Pilula> : <Pilula tom="ok">Devolvido</Pilula>}</td>
                      <td className={td}>{!e.devolvido && <BotaoBreve variante="linha">Devolver</BotaoBreve>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Painel>

        <Painel>
          <CabecalhoPainel
            icone={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            }
            titulo="Registrar empréstimo"
          />
          <CampoRotulado rotulo="Documento">
            <input {...desativado} />
          </CampoRotulado>
          <CampoRotulado rotulo="Retirado por">
            <input {...desativado} />
          </CampoRotulado>
          <CampoRotulado rotulo="Setor">
            <select {...desativado} />
          </CampoRotulado>
          <div className="grid grid-cols-2 gap-3">
            <CampoRotulado rotulo="Data da retirada">
              <input {...desativado} />
            </CampoRotulado>
            <CampoRotulado rotulo="Prazo de devolução">
              <input {...desativado} />
            </CampoRotulado>
          </div>
          <CampoRotulado rotulo="Observação">
            <input {...desativado} />
          </CampoRotulado>
          <div className="mt-1 flex gap-2.5">
            <BotaoBreve variante="primario" className="flex-1">
              Registrar empréstimo
            </BotaoBreve>
            <BotaoBreve>Limpar</BotaoBreve>
          </div>
          <p className="text-[13px] leading-5 text-texto-suave">
            O documento passa para &quot;Emprestado&quot; e a caixa fica marcada no mapa até a devolução.
          </p>
        </Painel>
      </div>
    </PaginaSistema>
  );
}
