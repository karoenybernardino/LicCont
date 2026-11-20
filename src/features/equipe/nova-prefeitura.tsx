"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import { Campo } from "@/ui/campo";
import { Selecao } from "@/ui/selecao";
import { Girando } from "@/ui/carregando";
import { botaoPrimario } from "@/ui/canvas";
import type { EstadoAcao } from "@/ui/formulario";
import { MODULOS } from "@/features/modulos/ocultos";
import { Painel, TituloPainel } from "@/features/estrutura/componentes";
import { criarPrefeitura } from "@/features/prefeituras/acoes";

const campo = "!min-h-10 !rounded-lg !text-sm";
const botaoContornoGrande = "inline-flex min-h-10 items-center justify-center rounded-lg border border-linha px-5 text-sm font-medium hover:border-destaque focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco";
const ROTULOS = ["Órgão", MODULOS.tce ? "Contrato e TCE-CE" : "Contrato", "Administrador", "Conferir"];
const SITUACOES: Record<string, string> = { implantacao: "Em implantação", ativa: "Ativa", suspensa: "Suspensa" };
const PASSOS_SALVAR = [
  "A base da prefeitura é criada, separada das outras.",
  "A prefeitura cadastra as próprias secretarias no primeiro acesso.",
  "O administrador, se informado, entra com uma senha provisória mostrada ao salvar.",
  "Tudo fica registrado na auditoria.",
];

// Quadro EquipeNovaPrefeitura: quatro passos (Órgão, Contrato e TCE-CE, Administrador, Conferir)
// num só formulário; o envio só acontece no último passo.
export function NovaPrefeitura({ nomeInicial }: { nomeInicial?: string }) {
  const [estado, enviar, pendente] = useActionState<EstadoAcao, FormData>(criarPrefeitura, undefined);
  const [passo, setPasso] = useState(1);
  const [resumo, setResumo] = useState<Record<string, string>>({});
  const [tce, setTce] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const secao = useRef<(HTMLElement | null)[]>([]);

  const valido = () => [...(secao.current[passo - 1]?.querySelectorAll<HTMLInputElement>("input, select") ?? [])].every((c) => c.reportValidity());
  const ir = (novo: number) => {
    if (novo > passo && !valido()) return;
    if (novo === 4 && formRef.current) setResumo(Object.fromEntries([...new FormData(formRef.current)].map(([k, v]) => [k, String(v)])));
    setPasso(novo);
  };
  const oculto = (n: number) => (passo === n ? "" : "hidden");

  return (
    <form ref={formRef} action={enviar} noValidate className="flex flex-col gap-4">
      <ol className="flex flex-wrap gap-2" aria-label="Passos">
        {ROTULOS.map((r, i) => (
          <li key={r} aria-current={passo === i + 1 ? "step" : undefined} className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[13px] ${passo === i + 1 ? "border-destaque font-semibold" : "border-linha text-texto-suave"}`}>
            <span aria-hidden className="flex size-5 items-center justify-center rounded-full bg-[rgba(14,116,144,.12)] font-mono text-xs dark:bg-[rgba(45,212,191,.15)]">{i + 1}</span>
            {r}
          </li>
        ))}
      </ol>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-4">
          <div ref={(e) => { secao.current[0] = e; }} className={oculto(1)}>
            <Painel>
              <TituloPainel>Órgão</TituloPainel>
              <Campo rotulo="Nome do órgão" name="nome" required maxLength={200} defaultValue={nomeInicial} placeholder="Prefeitura Municipal de …" className={campo} />
              <Campo rotulo="CNPJ" name="cnpj" inputMode="numeric" required placeholder="00.000.000/0000-00" className={campo} />
            </Painel>
          </div>

          <div ref={(e) => { secao.current[1] = e; }} className={oculto(2)}>
            <Painel>
              <TituloPainel>Contrato</TituloPainel>
              <p className="-mt-2 text-[12.5px] text-texto-suave">Plano e valores combinados</p>
              <div className="grid gap-3.5 sm:grid-cols-2">
                <Selecao rotulo="Plano" name="plano" defaultValue="completo" className={campo}><option value="completo">Completo</option></Selecao>
                <Selecao rotulo="Situação inicial" name="status" defaultValue="implantacao" className={campo}>
                  {Object.entries(SITUACOES).map(([v, r]) => <option key={v} value={v}>{r}</option>)}
                </Selecao>
                <Campo rotulo="Implantação (R$)" name="valor_implantacao" inputMode="decimal" placeholder="0,00" className={campo} />
                <Campo rotulo="Mensalidade (R$)" name="valor_mensalidade" inputMode="decimal" placeholder="0,00" className={campo} />
                <Campo rotulo="Início do contrato" name="contrato_inicio" type="date" className={campo} />
              </div>
              {MODULOS.tce && (<>
              <TituloPainel>Integração com o TCE-CE</TituloPainel>
              <p className="-mt-2 text-[12.5px] text-texto-suave">Pode ligar agora ou depois, na prefeitura.</p>
              <label className="flex items-center gap-2.5 text-sm font-medium">
                <input type="checkbox" name="tce_ativo" checked={tce} onChange={(e) => setTce(e.target.checked)} className="size-4 accent-[#0e7490]" />
                Ligada
              </label>
              <Campo rotulo="Código do município no TCE" name="tce_codigo_municipio" inputMode="numeric" required={tce} placeholder="Só números" className={campo} />
              <p className="text-[12.5px] text-texto-suave">Busca automática toda noite, às 02:00. O TCE entrega os dados do processo e do contrato, não os arquivos. O PDF continua sendo anexado pela prefeitura.</p>
              </>)}
            </Painel>
          </div>

          <div ref={(e) => { secao.current[2] = e; }} className={oculto(3)}>
            <Painel>
              <TituloPainel>Primeiro administrador</TituloPainel>
              <p className="-mt-2 text-[12.5px] text-texto-suave">Opcional agora. Pode ser incluído depois.</p>
              <div className="grid gap-3.5 sm:grid-cols-2">
                <Campo rotulo="Nome completo" name="admin_nome" maxLength={200} placeholder="Nome do servidor" className={campo} />
                <Campo rotulo="E-mail institucional" name="admin_email" type="email" autoComplete="off" placeholder="nome@prefeitura.gov.br" className={campo} />
              </div>
              <p className="text-[12.5px] text-texto-suave">Ele entra com uma senha provisória, mostrada uma única vez ao salvar, e cria a própria senha no primeiro acesso.</p>
            </Painel>
          </div>

          <div ref={(e) => { secao.current[3] = e; }} className={oculto(4)}>
            <Painel>
              <TituloPainel>Conferir</TituloPainel>
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                {([
                  ["Órgão", resumo.nome], ["CNPJ", resumo.cnpj], ["Plano", "Completo"], ["Situação inicial", SITUACOES[resumo.status ?? "implantacao"]],
                  ["Implantação (R$)", resumo.valor_implantacao || "—"], ["Mensalidade (R$)", resumo.valor_mensalidade || "—"],
                  ["Início do contrato", resumo.contrato_inicio || "—"],
                  ...(MODULOS.tce ? ([["TCE-CE", resumo.tce_ativo ? `Ligado · município ${resumo.tce_codigo_municipio}` : "Desligado"]] as const) : []),
                  ["Administrador", resumo.admin_nome ? `${resumo.admin_nome}` : "Depois"],
                ] as const).map(([r, v]) => (
                  <div key={r}><dt className="text-texto-suave">{r}</dt><dd className="font-medium">{v || "—"}</dd></div>
                ))}
              </dl>
            </Painel>
          </div>

          {estado?.erro && <p role="alert" className="text-sm text-erro">{estado.erro}</p>}
          {estado?.aviso && (
            <div role="status" className="rounded-lg border border-linha bg-superficie-2 p-3 text-sm">
              <p>{estado.aviso}</p>
              {estado.senha && (
                <p className="mt-2">Senha provisória: <code data-testid="senha-provisoria" className="font-mono font-semibold">{estado.senha}</code></p>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-2.5">
            <Link href="/equipe/prefeituras" className={botaoContornoGrande}>Cancelar</Link>
            {passo > 1 && <button type="button" onClick={() => ir(passo - 1)} className={botaoContornoGrande}>Voltar</button>}
            {/* key: sem ela o React reaproveita o botão e o clique de Continuar vira envio do formulário. */}
            {passo < 4 ? (
              <button key="continuar" type="button" onClick={() => ir(passo + 1)} className={botaoPrimario}>Continuar</button>
            ) : (
              <button key="salvar" type="submit" disabled={pendente} className={`${botaoPrimario} disabled:opacity-50`}>
                {pendente ? <span className="inline-flex items-center gap-2"><Girando />Criando…</span> : "Salvar e criar base"}
              </button>
            )}
          </div>
        </div>

        <Painel>
          <span className="text-[11px] font-medium tracking-[.05em] text-texto-suave uppercase">O que acontece ao salvar</span>
          <ol className="flex flex-col gap-3">
            {PASSOS_SALVAR.map((t, i) => (
              <li key={t} className="flex items-start gap-3 text-[13px] leading-[19px]">
                <span aria-hidden className="flex size-[22px] shrink-0 items-center justify-center rounded-full bg-[rgba(14,116,144,.12)] font-mono text-xs font-medium text-destaque dark:bg-[rgba(45,212,191,.15)]">{i + 1}</span>
                {t}
              </li>
            ))}
          </ol>
        </Painel>
      </div>
    </form>
  );
}
