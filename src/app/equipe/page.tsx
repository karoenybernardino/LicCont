import type { Metadata } from "next";
import { Campo } from "@/ui/campo";
import { Formulario } from "@/ui/formulario";
import { Selecao } from "@/ui/selecao";
import { CartaoResumo, Pilula } from "@/ui/canvas";
import { PaginaEquipe } from "@/features/equipe/pagina";
import { Painel, TituloPainel } from "@/features/estrutura/componentes";
import { Icone } from "@/features/sessao/barra-lateral";
import { listarPrefeituras } from "@/features/prefeituras/dados";
import { exigirEquipe } from "@/features/sessao/dal";
import { cadastrarPrefeitura, cadastrarPrimeiroAdmin, mudarStatus } from "@/features/prefeituras/acoes";

export const metadata: Metadata = { title: "Prefeituras · LicCONT" };

const SITUACOES = { implantacao: "Em implantação", ativa: "Ativa", suspensa: "Suspensa" } as const;
const TONS = { implantacao: "aviso", ativa: "ok", suspensa: "erro" } as const;

// Painel da equipe LicCONT: prefeituras e primeiro administrador.
export default async function PainelEquipe() {
  await exigirEquipe();
  const prefeituras = await listarPrefeituras();
  const n = (s: keyof typeof SITUACOES) => prefeituras.filter((p) => p.status === s).length;

  return (
    <PaginaEquipe titulo="Prefeituras">
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <CartaoResumo rotulo="Prefeituras" valor={String(prefeituras.length)} legenda={`${n("ativa")} ativas · ${n("implantacao")} em implantação`} cor="teal" icone={<Icone nome="secretarias" />} />
        <CartaoResumo rotulo="Ativas" valor={String(n("ativa"))} legenda="em uso pelos órgãos" cor="aco" icone={<Icone nome="inicio" />} />
        <CartaoResumo rotulo="Documentos no ar" valor="0" legenda="o cadastro chega na Fase 3" cor="ambar" icone={<Icone nome="cadastro" />} />
        <CartaoResumo rotulo="Suspensas" valor={String(n("suspensa"))} legenda="sem acesso ao sistema" cor="vermelho" icone={<Icone nome="auditoria" />} />
      </div>

      <Painel>
        <TituloPainel>Prefeituras cadastradas</TituloPainel>
        <ul className="-mx-5 flex flex-col">
          {prefeituras.map((p) => (
            <li key={p.id} className="flex flex-col gap-4 border-t border-linha px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold">{p.nome}</h2>
                  <p className="font-mono text-[12.5px] font-medium text-texto-suave">
                    CNPJ {p.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5")}
                  </p>
                </div>
                <Pilula tom={TONS[p.status]}>{SITUACOES[p.status]}</Pilula>
              </div>
              <div className="grid gap-6 sm:grid-cols-2">
                <Formulario acao={mudarStatus} botao="Salvar situação" enviando="Salvando…" variante="secundario">
                  <input type="hidden" name="id" value={p.id} />
                  <Selecao rotulo={`Situação de ${p.nome}`} name="status" defaultValue={p.status}>
                    {Object.entries(SITUACOES).map(([valor, rotulo]) => (
                      <option key={valor} value={valor}>
                        {rotulo}
                      </option>
                    ))}
                  </Selecao>
                </Formulario>
                <details>
                  <summary className="cursor-pointer text-[13px] text-destaque">
                    Primeiro administrador<span className="sr-only"> de {p.nome}</span>
                  </summary>
                  <Formulario acao={cadastrarPrimeiroAdmin} botao="Cadastrar administrador" enviando="Cadastrando…" className="mt-3">
                    <input type="hidden" name="id" value={p.id} />
                    <Campo rotulo="Nome do administrador" name="nome" required maxLength={200} />
                    <Campo rotulo="E-mail do administrador" name="email" type="email" autoComplete="off" required />
                  </Formulario>
                </details>
              </div>
            </li>
          ))}
        </ul>
      </Painel>

      <Painel>
        <TituloPainel>Cadastrar prefeitura</TituloPainel>
        <Formulario acao={cadastrarPrefeitura} botao="Cadastrar" enviando="Cadastrando…" className="max-w-md">
          <Campo rotulo="Nome do órgão" name="nome" required maxLength={200} />
          <Campo rotulo="CNPJ" name="cnpj" inputMode="numeric" required placeholder="00.000.000/0000-00" />
        </Formulario>
      </Painel>
    </PaginaEquipe>
  );
}
