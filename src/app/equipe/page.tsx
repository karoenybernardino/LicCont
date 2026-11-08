import type { Metadata } from "next";
import { Campo } from "@/ui/campo";
import { Cartao } from "@/ui/cartao";
import { Formulario } from "@/ui/formulario";
import { Selecao } from "@/ui/selecao";
import { listarPrefeituras } from "@/features/prefeituras/dados";
import { CabecalhoSistema } from "@/features/sessao/cabecalho";
import { exigirEquipe } from "@/features/sessao/dal";
import { cadastrarPrefeitura, cadastrarPrimeiroAdmin, mudarStatus } from "@/features/prefeituras/acoes";

export const metadata: Metadata = { title: "Prefeituras · LicCONT" };

const SITUACOES = { implantacao: "Em implantação", ativa: "Ativa", suspensa: "Suspensa" } as const;

// Painel mínimo da equipe LicCONT (Fase 1): prefeituras e primeiro administrador.
export default async function PainelEquipe() {
  await exigirEquipe();
  const prefeituras = await listarPrefeituras();

  return (
    <>
      <CabecalhoSistema />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
        <h1 className="text-2xl">Equipe LicCONT · Prefeituras</h1>

        <ul className="flex flex-col gap-4">
          {prefeituras.map((p) => (
            <li key={p.id}>
              <Cartao className="flex flex-col gap-4">
                <div>
                  <h2 className="text-lg">{p.nome}</h2>
                  <p className="text-sm text-texto-suave">
                    CNPJ {p.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5")} ·{" "}
                    {SITUACOES[p.status]}
                  </p>
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
                    <summary className="cursor-pointer text-sm text-destaque">
                      Primeiro administrador<span className="sr-only"> de {p.nome}</span>
                    </summary>
                    <Formulario
                      acao={cadastrarPrimeiroAdmin}
                      botao="Cadastrar administrador"
                      enviando="Cadastrando…"
                      className="mt-3"
                    >
                      <input type="hidden" name="id" value={p.id} />
                      <Campo rotulo="Nome do administrador" name="nome" required maxLength={200} />
                      <Campo rotulo="E-mail do administrador" name="email" type="email" autoComplete="off" required />
                    </Formulario>
                  </details>
                </div>
              </Cartao>
            </li>
          ))}
        </ul>

        <Cartao>
          <h2 className="mb-4 text-lg">Cadastrar prefeitura</h2>
          <Formulario acao={cadastrarPrefeitura} botao="Cadastrar" enviando="Cadastrando…" className="max-w-md">
            <Campo rotulo="Nome do órgão" name="nome" required maxLength={200} />
            <Campo rotulo="CNPJ" name="cnpj" inputMode="numeric" required placeholder="00.000.000/0000-00" />
          </Formulario>
        </Cartao>
      </main>
    </>
  );
}
