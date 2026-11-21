import Link from "next/link";
import { Campo } from "@/ui/campo";
import { Formulario } from "@/ui/formulario";
import { BotaoEnviar } from "@/ui/botao-enviar";
import { Pilula, botaoPrimario } from "@/ui/canvas";
import { Painel, botaoPequeno, classeLinha, linhaCabecalho, td, th } from "@/features/estrutura/componentes";
import type { PessoaParceira } from "@/features/demo/parceira";
import { alocarPessoa, ativarPessoa, convidarPessoa } from "./acoes";

type Prefeitura = { id: string; nome: string };

// Tabela de pessoas da empresa, alocação e convite (quadros PartEquipe e EquipeParceiraDetalhe).
// Usada pelo dono (/parceira/equipe) e pela equipe LicCONT (/equipe/parceiras/[id]); o banco confere quem chama.
export function EquipeParceira({
  pessoas,
  prefeituras,
  base,
  editar,
  convidar,
  parceiraId,
  porEquipe,
}: {
  pessoas: PessoaParceira[];
  /** Prefeituras vinculadas à empresa (opções de alocação). */
  prefeituras: Prefeitura[];
  base: string;
  editar?: string;
  convidar?: boolean;
  parceiraId: string;
  porEquipe: boolean;
}) {
  const alvo = pessoas.find((p) => p.id === editar && p.papel === "funcionario");
  const marcadas = new Set(alvo?.prefeituras.map((x) => x.id));
  const sep = base.includes("?") ? "&" : "?";
  return (
    <>
      <Painel className="pb-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div>
            <h2 className="font-titulo text-base font-bold">{porEquipe ? "Funcionários e alocação" : "Pessoas da empresa"}</h2>
            <p className="mt-0.5 text-xs text-texto-suave">
              {porEquipe ? "A equipe LicCONT pode alocar e retirar prefeituras de qualquer pessoa." : "O dono escolhe em quais prefeituras cada funcionário trabalha."}
            </p>
          </div>
          <Link href={`${base}${sep}convidar=1`} className={botaoPrimario}>
            {porEquipe ? "+ Convidar pessoa" : "+ Convidar funcionário"}
          </Link>
        </div>
        <div className="-mx-5 -mb-1.5 overflow-x-auto">
          <table className="w-full border-collapse">
            <caption className="sr-only">Pessoas da empresa</caption>
            <thead>
              <tr className={linhaCabecalho}>
                <th scope="col" className={th}>Pessoa</th>
                <th scope="col" className={th}>Perfil</th>
                <th scope="col" className={th}>Prefeituras</th>
                <th scope="col" className={th}>Alocado por</th>
                <th scope="col" className={th}>Situação</th>
                <th scope="col" className={th}><span className="sr-only">Ações</span></th>
              </tr>
            </thead>
            <tbody>
              {pessoas.map((p, i) => {
                const dono = p.papel === "dono";
                return (
                  <tr key={p.id} className={classeLinha(p.id === alvo?.id, i % 2 === 1)}>
                    <td className={td}>
                      <div className="font-semibold">{p.nome}</div>
                      <div className="text-xs text-texto-suave">{p.email ?? "—"}</div>
                    </td>
                    <td className={td}>{dono ? "Dono" : "Funcionário"}</td>
                    <td className={`${td} whitespace-normal`}>
                      {dono ? `Todas (${prefeituras.length})` : p.prefeituras.length ? p.prefeituras.map((x) => x.nome).join(", ") : "Sem prefeitura"}
                    </td>
                    <td className={td}>{dono || p.prefeituras.length === 0 ? "—" : [...new Set(p.prefeituras.map((x) => x.alocadoPor))].join(", ")}</td>
                    <td className={td}>
                      {!p.ativa ? <Pilula tom="erro">Bloqueado</Pilula> : p.trocaSenha ? <Pilula tom="aviso">Convite enviado</Pilula> : <Pilula tom="ok">Ativo</Pilula>}
                    </td>
                    <td className={`${td} flex items-center gap-2`}>
                      {!dono && (
                        <>
                          <Link href={`${base}${sep}editar=${p.id}`} className={botaoPequeno}>Editar</Link>
                          <form action={ativarPessoa}>
                            <input type="hidden" name="pessoa" value={p.id} />
                            <input type="hidden" name="ativa" value={p.ativa ? "nao" : "sim"} />
                            <BotaoEnviar className={botaoPequeno}>{p.ativa ? "Bloquear" : "Liberar"}</BotaoEnviar>
                          </form>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Painel>

      {alvo && (
        <Painel>
          <h2 className="font-titulo text-base font-bold">Alocação de {alvo.nome}</h2>
          <p className="text-xs text-texto-suave">Marque as prefeituras que a pessoa pode acessar. Ela vê só essas no painel, na pesquisa, no mapa e nas etiquetas.</p>
          <Formulario acao={alocarPessoa} botao="Salvar alocação" enviando="Salvando…" variante="principal">
            <input type="hidden" name="pessoa" value={alvo.id} />
            <fieldset className="flex flex-col gap-2">
              <legend className="sr-only">Prefeituras</legend>
              {prefeituras.map((x) => (
                <label key={x.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="prefeitura" value={x.id} defaultChecked={marcadas.has(x.id)} className="size-4 accent-[#0e7490]" />
                  {x.nome}
                </label>
              ))}
            </fieldset>
          </Formulario>
          <Link href={base} className="text-[13px] text-destaque hover:underline">Cancelar</Link>
          <p className="text-xs text-texto-suave">A equipe LicCONT também pode alocar. A coluna &quot;Alocado por&quot; mostra quem fez a última mudança.</p>
        </Painel>
      )}

      {convidar && (
        <Painel>
          <h2 className="font-titulo text-base font-bold">{porEquipe ? "Convidar pessoa" : "Convidar funcionário"}</h2>
          <p className="text-xs text-texto-suave">Nenhum e-mail é enviado: a senha provisória aparece uma vez, aqui na tela.</p>
          <Formulario acao={convidarPessoa} botao="Cadastrar" enviando="Cadastrando…" variante="principal">
            <input type="hidden" name="parceira" value={parceiraId} />
            <Campo rotulo="Nome" name="nome" required />
            <Campo rotulo="E-mail" name="email" type="email" autoComplete="off" required />
            {porEquipe && (
              <label className="flex flex-col gap-1 text-sm">
                Perfil
                <select name="papel" defaultValue="funcionario" className="min-h-10 rounded-lg border border-borda-campo bg-campo px-3">
                  <option value="funcionario">Funcionário</option>
                  <option value="dono">Dono</option>
                </select>
              </label>
            )}
          </Formulario>
        </Painel>
      )}
    </>
  );
}
