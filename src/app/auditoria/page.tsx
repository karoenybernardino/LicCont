import type { Metadata } from "next";
import { z } from "zod";
import { Busca, Filtros, botaoPrimario } from "@/ui/canvas";
import { CartaoNumero, Etiqueta, Painel, Rotulo, classeLinha, linhaCabecalho, td, th } from "@/features/estrutura/componentes";
import { numeroBR } from "@/features/estrutura/ocupacao";
import { exigirAdmin } from "@/features/sessao/dal";
import { PaginaSistema } from "@/features/sessao/pagina";
import { categoriaDe, classificar, origemDe } from "@/features/auditoria/classificar";
import { diaBrasilia, resumirAuditoria } from "@/features/auditoria/resumo";
import { lerAuditoria } from "@/features/movimento/dados";
import { BotaoBreve, CampoRotulado, LinhaVazia, Selo, campo } from "@/features/movimento/ui";
import { listarUsuarios } from "@/features/usuarios/dados";
import { PERFIS } from "@/features/usuarios/esquemas";

export const metadata: Metadata = { title: "Auditoria · LicCONT" };

const ABAS = { todas: "Todas", emprestimos: "Empréstimos", cadastro: "Cadastro", descarte: "Descarte" } as const;
const ACOES = ["Empréstimo", "Cadastro", "Devolução", "Descarte", "Edição", "Login"];

const data = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const um = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

// "08/11 01:12", no fuso de Brasília.
const quandoBR = (iso: string) => {
  const d = new Date(iso);
  const dia = d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit" });
  const hora = d.toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });
  return `${dia} ${hora}`;
};

export default async function Auditoria({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { usuario, secretaria } = await exigirAdmin();
  const p = await searchParams;
  const hoje = diaBrasilia(new Date());
  const inicioMes = `${hoje.slice(0, 8)}01`;
  const aba = z.enum(["todas", "emprestimos", "cadastro", "descarte"]).catch("todas").parse(um(p.aba));
  const q = z.string().max(100).catch("").parse(um(p.q) ?? "").trim();
  const de = data.catch(inicioMes).parse(um(p.de));
  const ate = data.catch(hoje).parse(um(p.ate));

  // Cartões do mês e de hoje saem da mesma leitura que a lista.
  const [registros, usuarios] = await Promise.all([
    lerAuditoria(de < inicioMes ? de : inicioMes, ate > hoje ? ate : hoje),
    listarUsuarios(),
  ]);
  const quem = new Map(usuarios.map((u) => [u.id, u]));
  const resumo = resumirAuditoria(registros);
  const busca = q.toLowerCase();
  const linhas = registros
    .filter((r) => {
      const d = diaBrasilia(new Date(r.quando));
      return d >= de && d <= ate;
    })
    .filter((r) => aba === "todas" || categoriaDe(r.acao) === aba)
    .filter((r) => !busca || (r.titulo ?? "").toLowerCase().includes(busca) || (quem.get(r.usuarioId ?? "")?.nome ?? "").toLowerCase().includes(busca))
    .slice(0, 200);

  const href = (a: string) => {
    const params = new URLSearchParams({ de, ate });
    if (a !== "todas") params.set("aba", a);
    if (q) params.set("q", q);
    return `/auditoria?${params}`;
  };
  const colunas = ["Quando", "Usuário", "Ação", "Documento e caixa", "Origem"];

  return (
    <PaginaSistema usuario={usuario} secretaria={secretaria} titulo="Auditoria" trilha="Administração · Registro de ações">
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <CartaoNumero rotulo="Ações hoje" valor={numeroBR(resumo.hoje)} legenda={`de ${numeroBR(resumo.usuariosHoje)} ${resumo.usuariosHoje === 1 ? "usuário ativo" : "usuários ativos"}`} cor="teal" icone="caixa" serie={[resumo.hoje]} />
        <CartaoNumero rotulo="Descartes no mês" valor={numeroBR(resumo.descartes)} legenda="com termo gerado" cor="vermelho" icone="folha" serie={[resumo.descartes]} />
        <CartaoNumero rotulo="Empréstimos no mês" valor={numeroBR(resumo.emprestimos)} legenda="ainda em aberto" cor="ambar" icone="caixa" serie={[resumo.emprestimos]} />
        <CartaoNumero rotulo="Logins no mês" valor={numeroBR(resumo.logins)} legenda={`${numeroBR(resumo.recusadas)} ${resumo.recusadas === 1 ? "tentativa recusada" : "tentativas recusadas"}`} cor="aco" icone="pasta" serie={[resumo.logins]} />
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[1fr_280px]">
        <Painel className="pb-1.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Filtros itens={(Object.entries(ABAS) as [string, string][]).map(([k, rotulo]) => ({ href: href(k), rotulo, ativo: aba === k }))} />
              <div className="flex w-[220px]">
                <Busca acao="/auditoria" valor={q} rotulo="Buscar na auditoria" marcador="Documento ou usuário" extra={{ de, ate, ...(aba !== "todas" && { aba }) }} />
              </div>
            </div>
            <BotaoBreve>Exportar relatório</BotaoBreve>
          </div>
          <div className="-mx-5 overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className={linhaCabecalho}>
                  {colunas.map((c) => (
                    <th key={c} scope="col" className={th}>
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {linhas.length === 0 && <LinhaVazia colunas={colunas.length}>Nenhuma ação registrada neste período.</LinhaVazia>}
                {linhas.map((r, i) => {
                  const u = r.usuarioId ? quem.get(r.usuarioId) : undefined;
                  const a = classificar(r.acao);
                  return (
                    <tr key={r.id} className={classeLinha(false, i % 2 === 1)}>
                      <td className={`${td} font-mono text-xs`}>{quandoBR(r.quando)}</td>
                      <td className={`${td} h-auto py-3`}>
                        <span className="block">{u ? u.nome : "Sistema"}</span>
                        <span className="block text-xs text-texto-suave">{u ? PERFIS[u.perfil] : "–"}</span>
                      </td>
                      <td className={td}>
                        <Selo tom={a.tom}>{a.rotulo}</Selo>
                      </td>
                      <td className={td}>
                        <span className="block font-semibold">{r.titulo ?? "Sistema"}</span>
                        <span className="block font-mono text-xs text-texto-suave">–</span>
                      </td>
                      <td className={`${td} text-[13px]`}>{origemDe(r.aparelho)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Painel>

        <Painel>
          <form action="/auditoria" className="flex flex-col gap-3.5">
            <Rotulo>Filtrar por período</Rotulo>
            {aba !== "todas" && <input type="hidden" name="aba" value={aba} />}
            {q && <input type="hidden" name="q" value={q} />}
            <CampoRotulado rotulo="De">
              <input type="date" name="de" defaultValue={de} className={campo} />
            </CampoRotulado>
            <CampoRotulado rotulo="Até">
              <input type="date" name="ate" defaultValue={ate} className={campo} />
            </CampoRotulado>
            <Rotulo>Ação</Rotulo>
            <div className="flex flex-wrap gap-1.5">
              {ACOES.map((a) => (
                <Etiqueta key={a}>{a}</Etiqueta>
              ))}
            </div>
            <button type="submit" className={`${botaoPrimario} w-full`}>
              Aplicar filtros
            </button>
          </form>
        </Painel>
      </div>
    </PaginaSistema>
  );
}
