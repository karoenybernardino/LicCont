import type { Metadata } from "next";
import Link from "next/link";
import { botaoPrimario } from "@/ui/canvas";
import { PaginaEquipe } from "@/features/equipe/pagina";
import { Painel, classeLinha, linhaCabecalho, td, th } from "@/features/estrutura/componentes";
import { listarParceiras, orgaosParaParceira } from "@/features/equipe/marca";
import { FormParceira } from "@/features/equipe/marca-form";
import { formatarCnpj } from "@/features/prefeituras/lista";
import { exigirEquipe } from "@/features/sessao/dal";

export const metadata: Metadata = { title: "Empresas parceiras · LicCONT" };

const ERROS: Record<string, string> = {
  dados: "Confira o nome e o CNPJ da empresa.",
  cnpj: "Já existe uma empresa com este CNPJ.",
  logo: "O logo precisa ser PNG ou SVG de até 1 MB.",
  demo: "Modo demonstração: nada foi salvo.",
};

// Quadro EquipeParceiras: empresas parceiras e os órgãos que usam cada uma.
export default async function Parceiras({ searchParams }: { searchParams: Promise<{ q?: string; sel?: string; nova?: string; ok?: string; erro?: string }> }) {
  await exigirEquipe();
  const busca = await searchParams;
  const q = (busca.q ?? "").trim().slice(0, 80).toLowerCase();
  const todas = await listarParceiras();
  const lista = q ? todas.filter((p) => p.nome.toLowerCase().includes(q) || p.cnpj.includes(q.replace(/\D/g, "") || "—")) : todas;
  const nova = busca.nova === "1";
  const sel = nova ? null : (todas.find((p) => p.id === busca.sel) ?? lista[0] ?? null);
  const orgaos = await orgaosParaParceira(sel?.id ?? "00000000-0000-0000-0000-000000000000");
  const erro = busca.erro ? (ERROS[busca.erro] ?? ERROS.dados) : null;

  return (
    <PaginaEquipe
      titulo="Empresas parceiras"
      trilha={
        <span>
          <Link href="/equipe" className="text-destaque hover:underline">Equipe LicCONT</Link>{" › "}
          <Link href="/equipe/prefeituras" className="text-destaque hover:underline">Prefeituras</Link>{" › Empresas parceiras"}
        </span>
      }
    >
      {(erro || busca.ok) && (
        <p role="status" className={`rounded-lg px-4 py-2.5 text-sm font-medium ${erro ? "bg-[#fee2e2] text-[#991b1b] dark:bg-[#3f1d1d] dark:text-[#fca5a5]" : "bg-[#ccfbf1] text-[#115e59] dark:bg-[#0e4a45] dark:text-[#7ff0df]"}`}>{erro ?? "Empresa salva."}</p>
      )}
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)]">
        <Painel>
          <div className="flex flex-wrap items-center gap-3">
            <form className="min-w-0 flex-1" role="search">
              <input name="q" defaultValue={busca.q ?? ""} aria-label="Buscar por nome ou CNPJ" placeholder="Buscar por nome ou CNPJ" className="min-h-10 w-full rounded-lg border border-borda-campo bg-campo px-3 text-sm" />
            </form>
            <Link href="/equipe/prefeituras/parceiras?nova=1" className={botaoPrimario}>+ Nova empresa</Link>
          </div>
          <div className="-mx-5 overflow-x-auto">
            <table className="w-full text-left">
              <caption className="sr-only">Empresas parceiras</caption>
              <thead>
                <tr className={linhaCabecalho}>
                  <th scope="col" className={th}>Empresa parceira</th>
                  <th scope="col" className={th}>CNPJ</th>
                  <th scope="col" className={th}>Órgãos</th>
                </tr>
              </thead>
              <tbody>
                {lista.length === 0 && <tr><td colSpan={3} className={`${td} text-texto-suave`}>Nenhuma empresa cadastrada.</td></tr>}
                {lista.map((p, i) => (
                  <tr key={p.id} className={classeLinha(sel?.id === p.id, i % 2 === 1)}>
                    <td className={`${td} font-semibold`}>
                      <Link href={`/equipe/prefeituras/parceiras?sel=${p.id}`} className="flex items-center gap-3 hover:underline">
                        <span className="flex h-8 w-14 items-center justify-center overflow-hidden rounded-md border border-linha bg-white text-[9px] font-bold text-[#3f5e66]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          {p.logoUrl ? <img src={p.logoUrl} alt="" className="max-h-full max-w-full object-contain" /> : "LOGO"}
                        </span>
                        {p.nome}
                      </Link>
                    </td>
                    <td className={`${td} font-mono text-[13px]`}>{formatarCnpj(p.cnpj)}</td>
                    <td className={td}>{p.prefeituras}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Painel>
        <Painel>
          <div>
            <h2 className="text-base font-bold">{nova ? "Nova empresa parceira" : (sel?.nome ?? "Empresa parceira")}</h2>
            <p className="text-[12.5px] text-texto-suave">Dados e logo que saem nas etiquetas.</p>
          </div>
          <FormParceira parceira={sel} orgaos={orgaos} />
        </Painel>
      </div>
      <p className="text-[12.5px] text-texto-suave">O logo do LicCONT é fixo e sempre fica no canto do rodapé das etiquetas.</p>
    </PaginaEquipe>
  );
}
