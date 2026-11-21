import { administraAcervo } from "@/features/parceira/escolha";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { Painel } from "@/features/estrutura/componentes";
import { exigirSessao } from "@/features/sessao/dal";
import { PaginaSistema } from "@/features/sessao/pagina";
import { esquemaId } from "@/features/documentos/esquemas";
import { podeConferir } from "@/features/documentos/dados";
import { aprovarTermo, cancelarTermo, publicarEdital } from "@/features/temporalidade/acoes";
import { AcaoTermo } from "@/features/temporalidade/acao";
import { Situacao } from "@/features/temporalidade/painel-termos";
import { obterTermo } from "@/features/temporalidade/dados";
import { PRAZO_CIENCIA_DIAS, aprovavelDesde, dataBR, diasEntre, hojeSaoPaulo } from "@/features/temporalidade/regras";
import { AVISO_AMBAR, AVISO_AZUL, BLOCO, BOTAO_CONTORNO, CAMPO, LINHA, ROTULO, SUAVE, TXT } from "@/features/temporalidade/ui";

export const metadata: Metadata = { title: "Termo de eliminação · LicCONT" };

type EstadoPasso = "feito" | "atual" | "pendente";
const AQUA = "bg-[#0e7490] dark:bg-[#2dd4bf]";
const COLUNAS = "grid-cols-[1.25fr_1.6fr_.9fr_1fr_.7fr]";

function Passo({ n, estado, titulo, ultimo = false, children }: { n: number; estado: EstadoPasso; titulo: string; ultimo?: boolean; children: ReactNode }) {
  return (
    <li className="relative flex gap-3 pb-4">
      {!ultimo && <span aria-hidden className={`absolute top-[30px] -bottom-1.5 left-3 w-0.5 ${estado === "feito" ? AQUA : "bg-[rgba(11,46,58,.12)] dark:bg-[#1b3a44]"}`} />}
      {estado === "feito" ? (
        <span className={`flex size-[26px] shrink-0 items-center justify-center rounded-full ${AQUA}`}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="stroke-white dark:stroke-[#0b2e3a]">
            <path d="M5 12l5 5 9-10" />
          </svg>
          <span className="sr-only">concluído</span>
        </span>
      ) : (
        <span
          className={`flex size-[26px] shrink-0 items-center justify-center rounded-full font-[family-name:var(--font-titulo)] text-xs ${
            estado === "atual"
              ? "border-2 border-[#0e7490] font-bold text-[#0e7490] dark:border-[#2dd4bf] dark:text-[#2dd4bf]"
              : `border-[1.5px] font-semibold ${LINHA} ${SUAVE}`
          }`}
        >
          {n}
        </span>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className={`text-sm font-semibold ${estado === "pendente" ? SUAVE : TXT}`}>{titulo}</div>
        {children}
      </div>
    </li>
  );
}

const Texto = ({ children }: { children: ReactNode }) => <div className={`text-[12.5px] leading-[18px] ${SUAVE}`}>{children}</div>;

function Aviso({ tipo, children }: { tipo: "azul" | "ambar"; children: ReactNode }) {
  return (
    <div className={`flex items-start gap-2.5 rounded-[10px] border px-3 py-2.5 ${tipo === "azul" ? AVISO_AZUL : AVISO_AMBAR}`}>
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        className={`mt-px shrink-0 ${tipo === "azul" ? "stroke-[#0e7490] dark:stroke-[#2dd4bf]" : "stroke-[#b45309] dark:stroke-[#fbbf24]"}`}
      >
        {tipo === "azul" ? (
          <>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 11v5M12 8h.01" />
          </>
        ) : (
          <>
            <path d="M12 9v4M12 17h.01" />
            <path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
          </>
        )}
      </svg>
      <span className="text-[12.5px] leading-[18px]">{children}</span>
    </div>
  );
}

const mesAno = (iso: string | null) => (iso ? `${iso.slice(5, 7)}/${iso.slice(0, 4)}` : "—");
const diaMes = (iso: string) => dataBR(iso).slice(0, 5);
const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

// Termo de eliminação, cinco estados (quadros TermoRascunho, TermoCiencia,
// TermoAndamento, TermoAprovado e TermoCancelado). Textos e datas saem do termo.
// O banco confere de novo toda etapa (papel, aprovador, prazo).
export default async function Termo({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!esquemaId.safeParse({ id }).success) notFound();
  const { usuario, secretaria } = await exigirSessao();
  const t = await obterTermo(id);
  if (!t) notFound();
  const hoje = hojeSaoPaulo();
  const numero = `${String(t.numero).padStart(3, "0")}/${t.ano}`;
  const podeAndar = await podeConferir(usuario, t.secretariaId);
  const caixas = new Set(t.documentos.map((d) => d.caixa)).size;
  const aprovado = t.situacao === "aprovado";
  const cancelado = t.situacao === "cancelado";
  const libera = t.editalEm ? aprovavelDesde(t.editalEm) : null;
  const liberada = !!libera && hoje >= libera;
  const decorridos = t.editalEm ? Math.min(PRAZO_CIENCIA_DIAS, Math.max(0, diasEntre(t.editalEm, hoje))) : 0;
  const faltam = libera ? Math.max(0, diasEntre(hoje, libera)) : 0;
  const arquivo = (formato: "pdf" | "docx") => `/temporalidade/termo/${t.id}/arquivo?formato=${formato}`;

  return (
    <PaginaSistema
      usuario={usuario}
      secretaria={secretaria}
      titulo={`Termo de eliminação ${numero}`}
      trilha={
        <span>
          <Link href="/temporalidade" className="font-normal text-[#0e7490] dark:text-[#2dd4bf]">
            Temporalidade
          </Link>{" "}
          <span className={SUAVE}>›</span> <span className={`font-semibold ${TXT}`}>Termo {numero}</span>
        </span>
      }
      acoes={
        <div className="flex items-center gap-2.5">
          <a className={BOTAO_CONTORNO} href={arquivo("docx")}>
            Baixar Word
          </a>
          <a className={BOTAO_CONTORNO} href={arquivo("pdf")}>
            Baixar PDF
          </a>
        </div>
      }
    >
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <Painel>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-[family-name:var(--font-titulo)] text-[17px] font-bold">Listagem de eliminação</h2>
              <p className={`mt-0.5 text-xs ${SUAVE}`}>Documentos com prazo de guarda cumprido, aprovados pela comissão.</p>
            </div>
            <Situacao situacao={t.situacao} />
          </div>

          <dl className={`grid grid-cols-2 gap-3.5 rounded-xl border px-4 py-3 sm:grid-cols-4 ${LINHA} ${BLOCO}`}>
            {[
              ["Secretaria", t.secretaria],
              ["Documentos", `${t.itens} · ${plural(caixas, "caixa", "caixas")}`],
              ["Base", "Tabela de temporalidade"],
              ["Destinação", "Eliminação"],
            ].map(([rotulo, valor]) => (
              <div key={rotulo} className="min-w-0">
                <dt className={ROTULO}>{rotulo}</dt>
                <dd className="mt-[3px] text-sm">{valor}</dd>
              </div>
            ))}
          </dl>

          <div className="-mx-5 overflow-x-auto">
            <div className="min-w-[560px]">
              <div className={`grid ${COLUNAS} gap-3 border-y bg-[rgba(14,116,144,.08)] px-5 py-2.5 dark:bg-[rgba(45,212,191,.07)] ${LINHA}`}>
                {["Documento", "Objeto", "Datas extremas", "Caixa", "Venceu"].map((c) => (
                  <span key={c} className={ROTULO}>
                    {c}
                  </span>
                ))}
              </div>
              {t.documentos.map((d) => (
                <div
                  key={`${d.titulo}-${d.caixa}`}
                  className={`grid ${COLUNAS} items-center gap-3 border-b px-5 py-3 hover:shadow-[inset_0_0_0_1.5px_#0e7490] dark:hover:shadow-[inset_0_0_0_1.5px_#2dd4bf] ${LINHA}`}
                >
                  <span className="font-[family-name:var(--font-titulo)] text-sm font-semibold">{d.titulo}</span>
                  <span className={`truncate text-[13px] ${SUAVE}`}>{d.objeto}</span>
                  <span className="font-mono text-[13px] font-medium">{d.extremos}</span>
                  <span className="font-mono text-[13px] font-medium">{d.caixa}</span>
                  <span className={`font-mono text-[13px] font-medium ${SUAVE}`}>{mesAno(d.vencimento)}</span>
                </div>
              ))}
            </div>
          </div>

          {!cancelado && (
            <>
              <div className="flex flex-col gap-2">
                <span className={ROTULO}>Assinaturas da comissão</span>
                <div className="grid grid-cols-3 gap-3.5">
                  {["Presidente da comissão", "Membro", "Membro"].map((a, i) => (
                    <div key={i} className={`mt-[22px] border-t border-[#3f5e66] pt-1.5 text-xs dark:border-[#9bb8bf] ${SUAVE}`}>
                      {a}
                    </div>
                  ))}
                </div>
              </div>
              <Aviso tipo="azul">
                {aprovado ? (
                  <>
                    Termo aprovado: ele não muda mais. Os documentos foram <b>desativados</b>, não apagados; o registro de cada um e a auditoria permanecem.
                  </>
                ) : (
                  "Base legal: Lei 8.159/1991, art. 9º, e Resolução CONARQ 40/2014. Ao ser aprovado, o termo não muda mais; nenhum documento é apagado, só desativado."
                )}
              </Aviso>
            </>
          )}
        </Painel>

        <Painel>
          <h2 className="font-[family-name:var(--font-titulo)] text-[17px] font-bold">Andamento</h2>
          <ol className="flex flex-col">
            <Passo n={1} estado="feito" titulo="Listagem gerada" ultimo={cancelado}>
              <Texto>{dataBR(t.geradoEm)} · pela coordenação da secretaria</Texto>
            </Passo>
            {cancelado ? (
              <Passo n={2} estado="feito" titulo="Termo cancelado" ultimo>
                <Texto>{dataBR(t.canceladoEm)} · pela coordenação da secretaria. Nenhum documento foi desativado.</Texto>
              </Passo>
            ) : (
              <>
                <Passo n={2} estado={t.editalEm ? "feito" : "atual"} titulo={t.editalEm ? "Edital de ciência publicado" : "Edital de ciência"}>
                  <Texto>
                    {t.editalEm
                      ? `Publicado em ${dataBR(t.editalEm)} no diário oficial do município.`
                      : `Publique o edital no diário oficial e registre a data aqui. Depois dela, contam ${PRAZO_CIENCIA_DIAS} dias.`}
                  </Texto>
                  {!t.editalEm && podeAndar && (
                    <AcaoTermo acao={publicarEdital} botao="Registrar edital" enviando="Registrando…" className={`rounded-[10px] border p-3 ${LINHA} ${BLOCO}`}>
                      <input type="hidden" name="id" value={t.id} />
                      <label className="flex min-w-0 flex-col gap-[5px]">
                        <span className={ROTULO}>Data de publicação do edital</span>
                        <input
                          name="data"
                          type="date"
                          required
                          max={hoje}
                          className={`min-h-10 w-full rounded-lg border px-3 font-mono text-sm font-medium outline-0 focus-visible:outline-2 focus-visible:outline-[#0e7490] dark:focus-visible:outline-[#2dd4bf] ${LINHA} ${CAMPO} ${TXT}`}
                        />
                      </label>
                    </AcaoTermo>
                  )}
                </Passo>
                <Passo
                  n={3}
                  estado={aprovado || liberada ? "feito" : t.editalEm ? "atual" : "pendente"}
                  titulo={t.editalEm && !aprovado && !liberada ? "Prazo de ciência em andamento" : "Prazo de ciência"}
                >
                  <Texto>
                    {aprovado
                      ? `Sem manifestação contrária em ${PRAZO_CIENCIA_DIAS} dias.`
                      : liberada
                        ? "Sem manifestação contrária no prazo."
                        : t.editalEm && libera
                          ? `Faltam ${plural(faltam, "dia", "dias")}. A aprovação é liberada em ${dataBR(libera)}.`
                          : `${PRAZO_CIENCIA_DIAS} dias depois do edital.`}
                  </Texto>
                  {t.editalEm && libera && (
                    <div className="flex flex-col gap-[5px]">
                      <div
                        role="progressbar"
                        aria-label="Prazo de ciência"
                        aria-valuemin={0}
                        aria-valuemax={PRAZO_CIENCIA_DIAS}
                        aria-valuenow={decorridos}
                        className="h-2 overflow-hidden rounded bg-[rgba(11,46,58,.12)] dark:bg-[#1b3a44]"
                      >
                        <div className={`h-full ${AQUA}`} style={{ width: `${(decorridos / PRAZO_CIENCIA_DIAS) * 100}%` }} />
                      </div>
                      <div className={`flex justify-between font-mono text-[11.5px] font-medium ${SUAVE}`}>
                        <span>{diaMes(t.editalEm)}</span>
                        <span>
                          {decorridos} de {PRAZO_CIENCIA_DIAS} dias
                        </span>
                        <span>{diaMes(libera)}</span>
                      </div>
                    </div>
                  )}
                </Passo>
                <Passo n={4} estado={aprovado ? "feito" : liberada ? "atual" : "pendente"} titulo={aprovado ? "Eliminação aprovada" : "Aprovação e eliminação"} ultimo>
                  <Texto>
                    {aprovado
                      ? `${dataBR(t.aprovadoEm)} · por um administrador, com dois fatores. ${plural(t.itens, "documento desativado", "documentos desativados")}.`
                      : "Um administrador diferente de quem gerou o termo aprova com dois fatores."}
                  </Texto>
                </Passo>
              </>
            )}
          </ol>

          <div aria-hidden className={`-mx-5 border-t ${LINHA}`} />
          <div className="flex flex-col gap-2.5">
          {aprovado && (
            <div className="flex items-center gap-2">
              <Situacao situacao="aprovado" />
              <span className={`text-[12.5px] ${SUAVE}`}>Termo registrado na auditoria. Não pode mais ser alterado.</span>
            </div>
          )}
          {cancelado && (
            <Aviso tipo="azul">Termo cancelado: ele fica guardado só para consulta e a auditoria. Para eliminar esses documentos, gere um termo novo.</Aviso>
          )}
          {t.situacao === "em_ciencia" && !liberada && <Aviso tipo="azul">Enquanto o prazo corre, o termo pode ser cancelado. Nenhum documento é desativado antes da aprovação.</Aviso>}
          {t.situacao === "em_ciencia" && liberada && administraAcervo(usuario) && (
            <>
              <Aviso tipo="ambar">
                Ao aprovar, os {t.itens} documentos são <b>desativados</b> e saem da pesquisa e do mapa. O registro de cada um, o PDF e a auditoria permanecem.
              </Aviso>
              <AcaoTermo acao={aprovarTermo} botao="Aprovar e eliminar" enviando="Aprovando…">
                <input type="hidden" name="id" value={t.id} />
              </AcaoTermo>
              <div className={`flex items-center gap-1.5 text-xs ${SUAVE}`}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <rect x="4" y="11" width="16" height="10" rx="2" />
                  <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                </svg>
                Pede o código do segundo fator. Quem gerou o termo não pode aprovar.
              </div>
            </>
          )}
          {(t.situacao === "rascunho" || t.situacao === "em_ciencia") && podeAndar && (
            <AcaoTermo acao={cancelarTermo} botao="Cancelar termo" enviando="Cancelando…" variante="contorno">
              <input type="hidden" name="id" value={t.id} />
            </AcaoTermo>
          )}
          </div>
        </Painel>
      </div>
    </PaginaSistema>
  );
}
