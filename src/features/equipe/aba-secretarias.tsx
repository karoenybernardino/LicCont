import Link from "next/link";
import { Pilula, botaoContorno, botaoPrimario } from "@/ui/canvas";
import { Painel, classeLinha, linhaCabecalho, td, th } from "@/features/estrutura/componentes";
import { cadastrarSecretaria, salvarSecretaria } from "@/features/secretarias/acoes";
import { listarRuasParaEscolha, listarSecretariasDetalhe } from "@/features/secretarias/dados";
import { FormularioSecretaria } from "@/features/secretarias/formulario";
import { listarUsuarios } from "@/features/usuarios/dados";

// Aba "Secretarias" do cadastro da prefeitura: só a equipe LicCONT cadastra e edita.
// "item" = "nova" abre o formulário vazio; um id abre a edição daquela secretaria.
export async function AbaSecretarias({ prefeitura, item }: { prefeitura: string; item?: string }) {
  const [todas, usuarios] = await Promise.all([listarSecretariasDetalhe(undefined, prefeitura), listarUsuarios(undefined, prefeitura)]);
  const aqui = `/equipe/${prefeitura}?aba=secretarias`;

  if (item === "nova" || todas.some((s) => s.id === item)) {
    const alvo = todas.find((s) => s.id === item);
    const ruas = await listarRuasParaEscolha(prefeitura);
    return (
      <>
        <p className="px-1 text-[13px] text-texto-suave">
          <Link href={aqui} className="text-destaque underline-offset-2 hover:underline">Secretarias</Link>
          {" › "}
          <b className="font-semibold text-texto">{alvo ? alvo.nome : "Nova secretaria"}</b>
        </p>
        <FormularioSecretaria
          acao={alvo ? salvarSecretaria : cadastrarSecretaria}
          prefeitura={prefeitura}
          inicial={alvo}
          usuarios={usuarios.filter((u) => u.ativo || u.id === alvo?.responsavelId)}
          ruas={ruas}
        />
      </>
    );
  }

  const nome = new Map(usuarios.map((u) => [u.id, u.nome]));
  return (
    <Painel className="pb-1.5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[12.5px] text-texto-suave">Só a equipe LicCONT cadastra e edita secretarias. O administrador da prefeitura só consulta.</p>
        <Link href={`${aqui}&item=nova`} className={botaoPrimario}>+ Nova secretaria</Link>
      </div>
      <div className="-mx-5 -mb-1.5 overflow-x-auto">
        <table className="w-full text-left">
          <caption className="sr-only">Secretarias da prefeitura</caption>
          <thead>
            <tr className={linhaCabecalho}>
              <th scope="col" className={th}>Secretaria</th>
              <th scope="col" className={th}>Sigla</th>
              <th scope="col" className={th}>Responsável</th>
              <th scope="col" className={th}>Usuários</th>
              <th scope="col" className={th}>Documentos</th>
              <th scope="col" className={th}>Situação</th>
              <th scope="col" className={th}><span className="sr-only">Ações</span></th>
            </tr>
          </thead>
          <tbody>
            {todas.map((s, i) => {
              const nUsuarios = usuarios.filter((u) => u.secretarias.includes(s.id)).length;
              return (
                <tr key={s.id} className={classeLinha(false, i % 2 === 1)}>
                  <td className={`${td} w-full font-semibold`}>{s.nome}</td>
                  <td className={`${td} font-mono text-[13px]`}>{s.sigla ?? "—"}</td>
                  <td className={`${td} whitespace-nowrap`}>{(s.responsavelId && nome.get(s.responsavelId)) || "—"}</td>
                  <td className={td}>{nUsuarios}</td>
                  <td className={`${td} font-mono text-[13px] font-medium`}>{s.documentos}</td>
                  <td className={td}>
                    {!s.ativa ? <Pilula tom="aviso">Desativada</Pilula> : nUsuarios === 0 ? <Pilula tom="aviso">Sem usuários</Pilula> : <Pilula tom="ok">Ativa</Pilula>}
                  </td>
                  <td className={`${td} text-right`}>
                    <Link href={`${aqui}&item=${s.id}`} aria-label={`Editar ${s.nome}`} className={botaoContorno}>Editar</Link>
                  </td>
                </tr>
              );
            })}
            {todas.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-sm text-texto-suave">Nenhuma secretaria cadastrada.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Painel>
  );
}
