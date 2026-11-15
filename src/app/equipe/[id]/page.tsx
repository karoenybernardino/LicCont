import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Formulario } from "@/ui/formulario";
import { Campo } from "@/ui/campo";
import { Selecao } from "@/ui/selecao";
import { CabecalhoPainel, Pilula } from "@/ui/canvas";
import { PaginaEquipe } from "@/features/equipe/pagina";
import { Painel, classeLinha, linhaCabecalho, td, th } from "@/features/estrutura/componentes";
import { idSchema } from "@/features/login/esquemas";
import { cadastrarPrimeiroAdmin, mudarStatus } from "@/features/prefeituras/acoes";
import { listarAdministradores, obterPrefeitura } from "@/features/prefeituras/dados";
import { formatarCnpj } from "@/features/prefeituras/lista";
import { exigirEquipe } from "@/features/sessao/dal";

export const metadata: Metadata = { title: "Prefeitura · LicCONT" };

const SITUACOES = { implantacao: "Em implantação", ativa: "Ativa", suspensa: "Suspensa" } as const;
const TONS = { implantacao: "aviso", ativa: "ok", suspensa: "erro" } as const;
const entrada = "!min-h-10 !rounded-lg !text-sm";

// Quadro EquipePrefeituraDetalhe: dados, situação e administradores.
export default async function DetalhePrefeitura({ params }: { params: Promise<{ id: string }> }) {
  await exigirEquipe();
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();
  const p = await obterPrefeitura(id);
  if (!p) notFound();
  const admins = await listarAdministradores(id);

  return (
    <PaginaEquipe
      titulo="Prefeitura"
      trilha={
        <span>
          <Link href="/equipe" className="text-destaque hover:underline">Equipe LicCONT</Link>
          {" › "}
          <Link href="/equipe" className="text-destaque hover:underline">Prefeituras</Link>
          {` › ${p.nome}`}
        </span>
      }
    >
      <Painel>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <span aria-hidden className="flex size-[52px] items-center justify-center rounded-[14px] bg-[linear-gradient(145deg,#5eead4,#0e7490)] text-white">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 21V8l8-5 8 5v13M9 21v-6h6v6" /></svg>
            </span>
            <div>
              <h2 className="text-xl font-bold">{p.nome}</h2>
              <p className="mt-0.5 text-[13px] text-texto-suave">
                <span className="font-mono font-medium">{formatarCnpj(p.cnpj)}</span>
              </p>
            </div>
          </div>
          <Pilula tom={TONS[p.status]}>{SITUACOES[p.status]}</Pilula>
        </div>
      </Painel>

      <div className="grid items-start gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
        <Painel>
          <span className="text-[11px] font-medium tracking-[.05em] text-texto-suave uppercase">Situação da prefeitura</span>
          <Formulario acao={mudarStatus} botao="Salvar" enviando="Salvando…" className="gap-3.5">
            <input type="hidden" name="id" value={p.id} />
            <Selecao rotulo="Situação" name="status" defaultValue={p.status} className={entrada}>
              {Object.entries(SITUACOES).map(([valor, rotulo]) => (
                <option key={valor} value={valor}>{rotulo}</option>
              ))}
            </Selecao>
          </Formulario>
        </Painel>

        <Painel>
          <CabecalhoPainel
            icone={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0" /></svg>}
            titulo="Administradores"
            subtitulo="Quem gerencia a prefeitura no sistema."
          />
          {admins.length > 0 && (
            <div className="-mx-5 overflow-x-auto">
              <table className="w-full text-left">
                <caption className="sr-only">Administradores da prefeitura</caption>
                <thead>
                  <tr className={linhaCabecalho}>
                    <th scope="col" className={th}>Nome</th>
                    <th scope="col" className={th}>E-mail</th>
                    <th scope="col" className={th}>Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {admins.map((a, i) => (
                    <tr key={a.id} className={classeLinha(false, i % 2 === 1)}>
                      <td className={`${td} font-semibold`}>{a.nome}</td>
                      <td className={`${td} text-[13px] text-texto-suave`}>{a.email}</td>
                      <td className={td}><Pilula tom={a.ativo ? "ok" : "aviso"}>{a.ativo ? "Ativo" : "Inativo"}</Pilula></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {admins.length === 0 && (
            <Formulario acao={cadastrarPrimeiroAdmin} botao="Cadastrar administrador" enviando="Cadastrando…" className="gap-3.5">
              <input type="hidden" name="id" value={p.id} />
              <div className="grid gap-3.5 sm:grid-cols-2">
                <Campo rotulo="Nome" name="nome" required maxLength={200} placeholder="Nome do servidor" className={entrada} />
                <Campo rotulo="E-mail institucional" name="email" type="email" autoComplete="off" required placeholder="nome@prefeitura.gov.br" className={entrada} />
              </div>
            </Formulario>
          )}
          <p className="text-[12.5px] text-texto-suave">Sem administrador, a prefeitura fica em Pendências até um novo ser cadastrado.</p>
        </Painel>
      </div>
    </PaginaEquipe>
  );
}
