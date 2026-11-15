import type { Metadata } from "next";
import { Busca, CabecalhoPainel, Filtros, Pilula } from "@/ui/canvas";
import { Painel, classeLinha, linhaCabecalho, td, th } from "@/features/estrutura/componentes";
import { exigirSessao } from "@/features/sessao/dal";
import { PaginaSistema } from "@/features/sessao/pagina";
import { contarEmprestimos, documentosEmprestaveis, listarEmprestimos, listarPedidos } from "@/features/movimento/dados";
import { dataBR, situacaoEmprestimo } from "@/features/movimento/situacao";
import { BotaoBreve, LinhaVazia } from "@/features/movimento/ui";
import { BotoesPedido } from "@/features/movimento/botoes-pedido";
import { BotaoDevolver } from "@/features/movimento/botao-devolver";
import { FormularioEmprestimo } from "@/features/movimento/formulario-emprestimo";
import { hojeBrasilia } from "@/features/movimento/esquemas";
import { secretariasParaCadastro } from "@/features/documentos/dados";
import { ehCoordenador } from "@/features/estrutura/dados";

export const metadata: Metadata = { title: "Empréstimos · LicCONT" };

const ABAS = ["abertos", "atrasados", "devolvidos", "pendentes"] as const;
type Aba = (typeof ABAS)[number];

export default async function Emprestimos({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { usuario, secretaria } = await exigirSessao();
  const p = await searchParams;
  const um = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");
  const aba: Aba = (ABAS as readonly string[]).includes(um(p.situacao)) ? (um(p.situacao) as Aba) : "abertos";
  const q = um(p.q).trim().slice(0, 100);

  const listaCadastro = await secretariasParaCadastro(usuario);
  const paraCadastro = listaCadastro.map((x) => x.id);
  const setores = listaCadastro.map((x) => x.nome);
  const cadastra = paraCadastro.length > 0;
  const [todos, emprestaveis, pedidos] = await Promise.all([listarEmprestimos(), documentosEmprestaveis(paraCadastro), listarPedidos(usuario.id)]);
  // Quem pode decidir: administrador ou coordenador (o banco confere a secretaria do pedido).
  const podeAprovar = usuario.administrador || (await ehCoordenador(usuario));
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
                ...(pedidos.length > 0 ? [{ href: href("pendentes"), rotulo: `Pendentes · ${pedidos.length}`, ativo: aba === "pendentes" }] : []),
              ]}
            />
            <div className="flex w-[240px]">
              <Busca acao="/emprestimos" valor={q} rotulo="Buscar empréstimo" marcador="Documento ou pessoa" extra={aba !== "abertos" ? { situacao: aba } : undefined} />
            </div>
          </div>
          <div className="sc -mx-5 overflow-x-auto">
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
                {aba === "pendentes" &&
                  pedidos.map((e, i) => (
                    <tr key={e.id} className={classeLinha(false, i % 2 === 1)}>
                      <td className={`${td} h-auto py-3`}>
                        <span className="block font-semibold">{e.titulo}</span>
                        <span className="block text-xs text-texto-suave">{e.objeto}</span>
                      </td>
                      <td className={td}>—</td>
                      <td className={td}>
                        <span className="block">{e.quem}</span>
                        <span className="block text-xs text-texto-suave">{e.setor}</span>
                      </td>
                      <td className={`${td} text-[13px]`}>{e.prazoDias} dias após aprovar</td>
                      <td className={td}><Pilula tom="aviso">{e.vencido ? "Vencido" : "Aguardando aprovação"}</Pilula></td>
                      <td className={td}><BotoesPedido id={e.id} podeAprovar={podeAprovar} meu={e.meu} vencido={e.vencido} /></td>
                    </tr>
                  ))}
                {aba === "pendentes" && pedidos.length === 0 && <LinhaVazia colunas={colunas.length}>Nenhum pedido aguardando aprovação.</LinhaVazia>}
                {aba !== "pendentes" && linhas.length === 0 && <LinhaVazia colunas={colunas.length}>Nenhum empréstimo registrado.</LinhaVazia>}
                {aba !== "pendentes" && linhas.map((e, i) => {
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
                      <td className={td}>
                        <span className="flex flex-wrap items-center gap-2">
                          {!e.devolvido && cadastra && <BotaoDevolver id={e.id} />}
                          <a href={`/emprestimos/${e.id}/termo?formato=pdf`} className="text-[13px] text-texto underline underline-offset-4" aria-label={`Termo de ${e.titulo} em PDF`}>PDF</a>
                          <a href={`/emprestimos/${e.id}/termo?formato=docx`} className="text-[13px] text-texto underline underline-offset-4" aria-label={`Termo de ${e.titulo} em Word`}>Word</a>
                        </span>
                      </td>
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
          <FormularioEmprestimo documentos={emprestaveis} hoje={hojeBrasilia()} setores={setores} />
          <p className="text-[13px] leading-5 text-texto-suave">
            O documento passa para &quot;Emprestado&quot; e a caixa fica marcada no mapa até a devolução.
          </p>
        </Painel>
      </div>
    </PaginaSistema>
  );
}
