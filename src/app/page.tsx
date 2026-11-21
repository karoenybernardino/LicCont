import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { usuarioAtual } from "@/features/sessao/dal";
import { Logo } from "@/ui/logo";
import { SeletorTema } from "@/ui/seletor-tema";
import { FormularioPedido } from "@/features/site/formulario-pedido";

export const metadata: Metadata = {
  title: "LicCONT · Arquivo de licitações e contratos",
  description: "Licitações e contratos no papel e no digital, com o endereço exato de cada caixa no galpão.",
};

const HOJE = [
  "Caixas empilhadas sem endereço: achar um contrato leva horas.",
  "Ninguém sabe quem pegou o documento nem quando volta.",
  "Prazos de guarda esquecidos: o galpão só enche.",
  "Em auditoria, é difícil provar quem mexeu em quê.",
];
const COM = [
  "Cada caixa tem endereço (rua, módulo, nível, caixa) e etiqueta com QR.",
  "Busca por número, título, objeto ou ano, e o sistema mostra onde o papel está.",
  "Empréstimos e devoluções registrados, com prazo e atraso.",
  "Tabela de temporalidade e termo de eliminação, com aprovação.",
  "Auditoria de cada entrada, busca e alteração.",
];
const RECURSOS = [
  ["Pesquisa com painel do documento", "Ao escolher um resultado, o painel mostra os dados e o endereço da caixa. Filtros por tipo, ano, secretaria e situação."],
  ["Mapa 3D", "Veja a rua, o módulo e o nível; clique na caixa e veja os documentos dentro."],
  ["Empréstimos", "Quem retirou, para quando e o que está atrasado."],
  ["Temporalidade", "Prazos de guarda por tipo de documento e termo de eliminação aprovado."],
];
const SEGURANCA = [
  ["Uma prefeitura por vez", "Cada prefeitura tem a sua base. Uma nunca enxerga os dados da outra."],
  ["A equipe não lê o acervo", "O suporte do LicCONT vê só números de uso, nunca o conteúdo dos documentos."],
  ["Tudo na auditoria", "Entradas, buscas, empréstimos e exportações ficam registrados, com data e IP."],
  ["Acesso protegido", "Senha forte, dois fatores para administradores e saída automática por inatividade."],
];
const PASSOS = [
  ["Conversa e piloto", "Entendemos o galpão e as secretarias, e começamos por uma prefeitura."],
  ["Estrutura e etiquetas", "Cadastramos ruas, módulos e caixas, e imprimimos as etiquetas."],
  ["Cadastro dos documentos", "A equipe da prefeitura cadastra o acervo; o PDF é opcional."],
  ["Uso no dia a dia", "Pesquisa, empréstimos e prazos de guarda funcionando para todos."],
];
const PERGUNTAS = [
  ["Preciso digitalizar tudo antes de começar?", "Não. O papel continua onde está, com endereço no sistema. O PDF de cada documento é opcional e pode vir depois."],
  ["Quem vê os documentos da prefeitura?", "Só as pessoas da própria prefeitura, e cada uma apenas nas secretarias a que foi vinculada. A equipe do LicCONT não lê o acervo."],
  ["E se a prefeitura quiser sair do sistema?", "A prefeitura pode pedir a exportação dos seus dados (planilhas e PDFs) e a eliminação do que ficou no sistema."],
  ["Funciona no celular?", "Sim. A pesquisa e a leitura do QR da etiqueta funcionam no navegador do celular."],
];

const secao = "mx-auto w-full max-w-[1120px] px-5 py-16 sm:px-10";
const sobre = "text-xs font-semibold uppercase tracking-[0.12em] text-destaque";
const h2 = "mt-2 max-w-[760px] font-titulo text-[28px] font-bold leading-[1.25] sm:text-[34px]";

function Marca({ ok = true }: { ok?: boolean }) {
  return (
    <span aria-hidden className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${ok ? "bg-destaque/15 text-destaque" : "bg-erro/15 text-erro"}`}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d={ok ? "M5 12l5 5 9-10" : "M6 6l12 12M18 6L6 18"} />
      </svg>
    </span>
  );
}

// Lidos na hora da requisição: o valor muda sem novo build.
const contato = (v: string | undefined) => v ?? "a definir";

export default async function Raiz() {
  const logado = await usuarioAtual();
  if (logado) redirect(logado.parceira ? "/parceira" : "/inicio");
  return (
    <div className="flex-1">
      <header className="mx-auto flex w-full max-w-[1120px] flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-10">
        <Logo className="text-xl" />
        <nav aria-label="Seções" className="hidden gap-7 text-sm text-texto-suave md:flex">
          <a href="#problema">O problema</a>
          <a href="#sistema">O sistema</a>
          <a href="#seguranca">Segurança</a>
          <a href="#implantacao">Implantação</a>
          <a href="#perguntas">Perguntas</a>
        </nav>
        <div className="flex items-center gap-2.5">
          <SeletorTema />
          <Link href="/entrar" className="inline-flex min-h-10 items-center rounded-lg border border-linha px-5 text-sm font-medium">
            Entrar
          </Link>
          <a href="#contato" className="inline-flex min-h-10 items-center rounded-lg bg-destaque px-5 text-sm font-semibold text-destaque-texto">
            Pedir demonstração
          </a>
        </div>
      </header>

      <main>
        <section className="mx-auto flex w-full max-w-[1120px] flex-col gap-5 px-5 pb-20 pt-10 sm:px-10">
          <span className="self-start rounded-full bg-destaque/15 px-3 py-1 text-[12.5px] font-semibold text-destaque">
            Arquivo morto de licitações e contratos
          </span>
          <h1 className="max-w-[760px] font-titulo text-[34px] font-bold leading-[1.18] sm:text-[44px]">
            O arquivo da prefeitura, encontrado em segundos.
          </h1>
          <p className="max-w-[560px] text-lg leading-[1.6] text-texto-suave">
            Licitações e contratos no papel e no digital, com o endereço exato de cada caixa no galpão. Pesquisa, empréstimos, prazos de guarda e auditoria em um só lugar.
          </p>
          <div className="flex flex-wrap gap-3">
            <a href="#contato" className="inline-flex min-h-[50px] items-center rounded-lg bg-destaque px-6 text-[15px] font-semibold text-destaque-texto">
              Pedir demonstração
            </a>
            <Link href="/entrar" className="inline-flex min-h-[50px] items-center rounded-lg border border-linha px-6 text-[15px] font-medium">
              Entrar no sistema
            </Link>
          </div>
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-texto-suave">
            {["Papel e digital", "Mapa 3D do galpão", "Auditoria de tudo"].map((t) => (
              <li key={t} className="inline-flex items-center gap-1.5">
                <Marca /> {t}
              </li>
            ))}
          </ul>
        </section>

        <section id="problema" className={secao}>
          <span className={sobre}>O problema</span>
          <h2 className={h2}>O papel guardado não pode virar um labirinto</h2>
          <p className="mt-3 max-w-[640px] text-[16.5px] leading-[1.6] text-texto-suave">
            O LicCONT organiza o que já existe no galpão e acrescenta o digital, sem exigir que a prefeitura digitalize tudo de uma vez.
          </p>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div className="flex flex-col gap-4 rounded-2xl border border-linha bg-superficie p-7">
              <h3 className="font-titulo text-xl font-bold">Hoje</h3>
              {HOJE.map((t) => (
                <p key={t} className="flex gap-3 text-[15px] leading-[1.55]">
                  <Marca ok={false} />
                  {t}
                </p>
              ))}
            </div>
            <div className="flex flex-col gap-4 rounded-2xl border border-destaque bg-superficie p-7">
              <h3 className="font-titulo text-xl font-bold">Com o LicCONT</h3>
              {COM.map((t) => (
                <p key={t} className="flex gap-3 text-[15px] leading-[1.55]">
                  <Marca />
                  {t}
                </p>
              ))}
            </div>
          </div>
        </section>

        <section id="sistema" className="bg-superficie-2/40">
          <div className={secao}>
            <span className={sobre}>O sistema</span>
            <h2 className={h2}>Tudo o que o arquivo precisa, em telas simples de usar</h2>
            <p className="mt-3 max-w-[640px] text-[16.5px] leading-[1.6] text-texto-suave">
              Feito para quem trabalha no dia a dia do arquivo: busca rápida, passo a passo claro e o mesmo visual no claro e no escuro.
            </p>
            <div className="mt-8 grid gap-5 sm:grid-cols-2">
              {RECURSOS.map(([t, d]) => (
                <div key={t} className="rounded-2xl border border-linha bg-superficie p-6">
                  <h3 className="font-titulo text-lg font-bold">{t}</h3>
                  <p className="mt-2 text-[15px] leading-[1.6] text-texto-suave">{d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="seguranca" className={secao}>
          <span className={sobre}>Segurança e LGPD</span>
          <h2 className={h2}>Os dados da prefeitura ficam da prefeitura</h2>
          <p className="mt-3 text-[16.5px] text-texto-suave">O sistema foi desenhado para separar os dados e deixar tudo registrado.</p>
          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            {SEGURANCA.map(([t, d]) => (
              <div key={t} className="rounded-2xl border border-linha bg-superficie p-6">
                <h3 className="font-titulo text-lg font-bold">{t}</h3>
                <p className="mt-2 text-[15px] leading-[1.6] text-texto-suave">{d}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 flex flex-wrap gap-x-3 text-sm text-texto-suave">
            <Link href="/privacidade" className="underline">
              Política de privacidade
            </Link>
            <span aria-hidden>·</span>
            <Link href="/termos" className="underline">
              Termo de uso
            </Link>
          </p>
        </section>

        <section id="implantacao" className="bg-superficie-2/40">
          <div className={secao}>
            <span className={sobre}>Implantação</span>
            <h2 className={h2}>Do primeiro contato ao uso diário, em quatro passos</h2>
            <ol className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {PASSOS.map(([t, d], i) => (
                <li key={t} className="rounded-2xl border border-linha bg-superficie p-6">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-destaque font-titulo text-sm font-bold text-destaque-texto">{i + 1}</span>
                  <h3 className="mt-3 font-titulo text-base font-bold">{t}</h3>
                  <p className="mt-2 text-sm leading-[1.6] text-texto-suave">{d}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="perguntas" className={secao}>
          <span className={sobre}>Perguntas</span>
          <h2 className={h2}>O que as prefeituras costumam perguntar</h2>
          <div className="mt-8 flex flex-col gap-3">
            {PERGUNTAS.map(([p, r]) => (
              <details key={p} className="rounded-xl border border-linha bg-superficie px-5 py-4">
                <summary className="cursor-pointer text-[15px] font-semibold">{p}</summary>
                <p className="mt-3 text-[15px] leading-[1.6] text-texto-suave">{r}</p>
              </details>
            ))}
          </div>
        </section>

        <section id="contato" className={`${secao} grid gap-10 lg:grid-cols-2`}>
          <div className="flex flex-col gap-4">
            <span className={sobre}>Fale com a gente</span>
            <h2 className={h2}>Vamos mostrar o sistema com o acervo da sua prefeitura em mente</h2>
            <p className="text-[16.5px] leading-[1.6] text-texto-suave">Respondemos o pedido e combinamos uma conversa curta, sem compromisso.</p>
            <dl className="mt-2 flex flex-col gap-3 text-[15px]">
              <div className="rounded-xl border border-linha bg-superficie px-4 py-3">
                <dt className="text-xs uppercase tracking-[0.04em] text-texto-suave">WhatsApp</dt>
                <dd>{contato(process.env.NEXT_PUBLIC_CONTATO_WHATSAPP)}</dd>
              </div>
              <div className="rounded-xl border border-linha bg-superficie px-4 py-3">
                <dt className="text-xs uppercase tracking-[0.04em] text-texto-suave">E-mail</dt>
                <dd>{contato(process.env.NEXT_PUBLIC_CONTATO_EMAIL)}</dd>
              </div>
            </dl>
          </div>
          <FormularioPedido />
        </section>
      </main>

      <footer className="border-t border-linha">
        <div className="mx-auto flex w-full max-w-[1120px] flex-wrap items-center justify-between gap-4 px-5 py-6 text-sm text-texto-suave sm:px-10">
          <Logo className="text-base" />
          <nav className="flex gap-5">
            <Link href="/privacidade">Política de privacidade</Link>
            <Link href="/termos">Termo de uso</Link>
            <Link href="/entrar">Entrar</Link>
          </nav>
          <span>© 2026 LicCONT</span>
        </div>
      </footer>
    </div>
  );
}
