"use client";

import { PrazoDeGuarda } from "@/features/temporalidade/prazo-guarda";
import type { Regra } from "@/features/temporalidade/regras";
import type { GrupoDoc, TipologiaDoc } from "@/features/demo/classificacao";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  caixaLivre,
  conferirEnvio,
  iniciarEnvio,
  listarCaixas,
  posicaoDaCaixaAcao,
  salvarDocumento,
} from "./acoes";
import type { CaixaOcupada } from "./dados";
import { MOTIVOS } from "./conferencia";
import { EscolhaRua } from "./escolha-rua";
import { EscolhaOrgao } from "./escolha-orgao";
import { useOrigem } from "@/features/etiquetas/origem";
import { urlDaCaixa } from "@/features/etiquetas/qr";
import { QrSvg } from "@/features/etiquetas/qr-svg";
import { descreverArquivo } from "./formato";
import { analisarPdf, enviarParaStorage } from "./pdf-navegador";
import { MODALIDADES, ORGAOS, type Orgao, type Tipo } from "./tipos";

export type OpcoesEstrutura = {
  ruas: { id: string; codigo: string; modulos: number; percentual: number }[];
  modulos: { id: string; ruaId: string; numero: number }[];
  niveis: { id: string; moduloId: string; numero: number }[];
};
export type Inicial = {
  id: string;
  tipo: Tipo;
  modalidade: string | null;
  numero: string;
  ano: number;
  objeto: string;
  tituloProcesso: string | null;
  orgao: Orgao;
  classeId: string | null;
  grupoId: string | null;
  tipologiaId: string | null;
  observacao: string | null;
  volume: number;
  secretariaId: string;
  caixaId: string;
  ruaId: string;
  moduloId: string;
  nivelId: string;
  arquivo: string | null;
};

export const caixaCampo =
  "min-h-10 w-full rounded-lg border border-borda-campo bg-campo px-3 text-sm text-texto focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-foco disabled:opacity-60";
export const secao = "flex flex-col gap-3.5 rounded-2xl border border-linha bg-superficie px-5 py-[18px]";
export const botaoBase =
  "inline-flex min-h-11 items-center justify-center rounded-lg px-5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco disabled:opacity-60";

function Rotulo({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <label htmlFor={id} className="text-[11px] font-medium tracking-[.05em] text-texto-suave uppercase">
      {children}
    </label>
  );
}

export function Campo({ rotulo, children, className = "" }: { rotulo: string; children: (id: string) => React.ReactNode; className?: string }) {
  const id = useId();
  return (
    <div className={`flex min-w-0 flex-col gap-[5px] ${className}`}>
      <Rotulo id={id}>{rotulo}</Rotulo>
      {children(id)}
    </div>
  );
}

export function Titulo({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5">
      <span aria-hidden className="flex size-[26px] items-center justify-center rounded-full bg-aqua font-titulo text-[13px] font-bold text-petroleo">
        {n}
      </span>
      <h2 className="text-base font-semibold">{children}</h2>
    </div>
  );
}

export function FormularioDocumento({
  secretarias,
  secretariaPadrao,
  estrutura,
  prefeitura,
  limiteMb,
  inicial,
  regras = [],
  grupos = [],
  tipologias = [],
}: {
  secretarias: { id: string; nome: string }[];
  secretariaPadrao: string;
  estrutura: OpcoesEstrutura;
  prefeitura: string;
  limiteMb: number;
  inicial?: Inicial;
  regras?: Regra[];
  grupos?: GrupoDoc[];
  tipologias?: TipologiaDoc[];
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [tipo, setTipo] = useState<Tipo>(inicial?.tipo ?? "licitacao");
  const [modalidade, setModalidade] = useState(inicial?.modalidade ?? "");
  const grupoPadrao = grupos.find((g) => g.chave === "licitacoes_contratos")?.id ?? grupos[0]?.id ?? "";
  const [grupoId, setGrupoId] = useState(inicial?.grupoId ?? grupoPadrao);
  const [classeId, setClasseId] = useState(inicial?.classeId ?? "");
  // Órgão do documento: vem da caixa escolhida, mas o cadastro pode trocar (documento da Câmara em caixa da Prefeitura).
  const [orgao, setOrgao] = useState<Orgao | "">(inicial?.orgao ?? "prefeitura");
  const [orgaoManual, setOrgaoManual] = useState(!!inicial);
  const grupoLic = grupos.find((g) => g.id === grupoId)?.chave === "licitacoes_contratos";
  const classesDoGrupo = regras.filter((r) => r.grupoId === grupoId && (r.ativa || r.id === classeId));
  const regraAtual = regras.find((r) => r.id === classeId);
  const tipologiasDoGrupo = tipologias.filter((t) => t.grupoId === grupoId);
  const tipoEfetivo: Tipo = grupoLic ? tipo : "outro";
  const [rua, setRua] = useState(inicial?.ruaId ?? "");
  const [modulo, setModulo] = useState(inicial?.moduloId ?? "");
  const [nivel, setNivel] = useState(inicial?.nivelId ?? "");
  const [caixa, setCaixa] = useState(inicial?.caixaId ?? "");
  const [caixas, setCaixas] = useState<CaixaOcupada[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [etapa, setEtapa] = useState<string | null>(null);
  const [progresso, setProgresso] = useState(0);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [avisosPdf, setAvisosPdf] = useState<string[]>([]);
  const [arrastando, setArrastando] = useState(false);
  const entrada = useRef<HTMLInputElement>(null);
  const [resumo, setResumo] = useState({ numero: inicial?.numero ?? "", objeto: inicial?.objeto ?? "", ano: String(inicial?.ano ?? new Date().getFullYear()), titulo: inicial?.tituloProcesso ?? "" });
  const origem = useOrigem();
  const [secretaria, setSecretaria] = useState(inicial?.secretariaId ?? secretariaPadrao);

  const modulosDaRua = estrutura.modulos.filter((m) => m.ruaId === rua);
  const niveisDoModulo = estrutura.niveis.filter((n) => n.moduloId === modulo);
  const caixaEscolhida = nivel ? caixas.find((c) => c.id === caixa) : undefined;
  // Sem escolha manual, o órgão do documento acompanha o da caixa.
  const orgaoAtual: Orgao | "" = orgaoManual ? orgao : (caixaEscolhida?.orgao ?? orgao);
  const ruaAtual = estrutura.ruas.find((r) => r.id === rua);
  const moduloAtual = estrutura.modulos.find((m) => m.id === modulo);
  const nivelAtual = estrutura.niveis.find((n) => n.id === nivel);

  useEffect(() => {
    let vivo = true;
    if (nivel) listarCaixas(nivel).then((l) => vivo && setCaixas(l));
    return () => {
      vivo = false;
    };
  }, [nivel]);

  const posicao =
    ruaAtual && moduloAtual && nivelAtual && caixaEscolhida
      ? `Rua ${ruaAtual.codigo} · Módulo ${moduloAtual.numero} · Nível ${nivelAtual.numero} · Caixa ${String(caixaEscolhida.numero).padStart(2, "0")}`
      : null;

  async function proximaLivre() {
    setErro(null);
    const id = await caixaLivre(nivel ? { nivel } : modulo ? { modulo } : rua ? { rua } : {});
    if (!id) return setErro("Não há caixa livre nesse lugar.");
    const p = await posicaoDaCaixaAcao(id);
    if (!p) return setErro("Não foi possível achar a caixa.");
    setRua(p.ruaId);
    setModulo(p.moduloId);
    setNivel(p.nivelId);
    setCaixa(id);
  }

  async function escolherArquivo(f: File | null) {
    setArquivo(f);
    setAvisosPdf([]);
    setErro(null);
    if (!f) return;
    if (f.size > limiteMb * 1024 * 1024) {
      setArquivo(null);
      return setErro(`${MOTIVOS.grande_demais} O limite é ${limiteMb} MB.`);
    }
    const a = await analisarPdf(f);
    if ("falha" in a) {
      setArquivo(null);
      return setErro(a.falha === "com_senha" ? MOTIVOS.com_senha : a.falha === "nao_pdf" ? MOTIVOS.nao_pdf : MOTIVOS.corrompido);
    }
    const lista: string[] = [];
    if (a.avisos.includes("resolucao_baixa")) lista.push("A resolução parece menor que 300 dpi.");
    if (a.avisos.includes("sem_pdfa")) lista.push("O arquivo não é PDF/A.");
    if (lista.length) lista.push("A digitalização pode não ter valor legal.");
    setAvisosPdf(lista);
  }

  function enviar(depois: "ver" | "novo" | "etiqueta", dados: FormData) {
    setErro(null);
    setAviso(null);
    dados.set("caixa", caixa);
    dados.set("tipo", tipoEfetivo);
    dados.set("orgao", orgaoAtual);
    if (inicial) dados.set("id", inicial.id);
    iniciar(async () => {
      setEtapa("Salvando…");
      const r = await salvarDocumento(dados);
      if (r.erro) {
        setEtapa(null);
        // Liga o erro ao campo (leitor de tela) e leva o foco até ele.
        const el = r.campo ? document.querySelector<HTMLElement>(`[name="${r.campo}"]`) : null;
        if (el) {
          el.setAttribute("aria-invalid", "true");
          el.setAttribute("aria-describedby", "erro-formulario");
          el.addEventListener("input", () => el.removeAttribute("aria-invalid"), { once: true });
          el.focus();
        }
        return setErro(r.erro);
      }
      if (!r.id) {
        setEtapa(null);
        return setAviso(r.aviso ?? null);
      }
      if (arquivo) {
        setEtapa("Preparando o PDF…");
        const a = await analisarPdf(arquivo);
        if ("falha" in a) {
          setEtapa(null);
          return setErro(`${MOTIVOS[a.falha === "com_senha" ? "com_senha" : "corrompido"]} O documento foi salvo sem o PDF.`);
        }
        const envio = await iniciarEnvio({ documento: r.id, nome: arquivo.name, tamanho: arquivo.size, miniatura: !!a.miniatura });
        if ("erro" in envio) {
          setEtapa(null);
          return setErro(`${envio.erro} O documento foi salvo sem o PDF.`);
        }
        setEtapa("Enviando o PDF…");
        const ok = await enviarParaStorage(envio.urlPdf, arquivo, setProgresso);
        if (!ok) {
          setEtapa(null);
          return setErro("O envio do PDF falhou. O documento foi salvo; abra-o para enviar de novo.");
        }
        if (a.miniatura && envio.urlMiniatura) await enviarParaStorage(envio.urlMiniatura, a.miniatura);
        setEtapa("Conferindo o PDF…");
        const c = await conferirEnvio({ arquivo: envio.arquivoId, paginas: a.paginas, avisos: a.avisos, miniatura: !!a.miniatura && !!envio.urlMiniatura });
        if (!c.ok) {
          setEtapa(null);
          return setErro(`${c.erro} O documento foi salvo sem o PDF.`);
        }
      }
      router.push(depois === "novo" ? "/documentos/novo?salvo=1" : depois === "etiqueta" ? `/etiquetas?caixas=${caixa}` : `/documentos/${r.id}`);
      router.refresh();
    });
  }

  return (
    <form
      action={(d) => enviar((d.get("depois") as "ver" | "novo" | "etiqueta") ?? "ver", d)}
      className="grid items-start gap-4 lg:grid-cols-[1fr_400px]"
      noValidate
    >
      <div className="flex min-w-0 flex-col gap-3.5">
        <section className={secao} aria-labelledby="t1">
          <div id="t1"><Titulo n={1}>Dados do documento</Titulo></div>
          <div className="grid gap-3.5 sm:grid-cols-3">
            <Campo rotulo="Grupo documental">
              {(id) => (
                <select id={id} value={grupoId} disabled={!!inicial} onChange={(e) => { setGrupoId(e.target.value); setClasseId(""); }} className={caixaCampo}>
                  {grupos.filter((g) => g.ativo || g.id === grupoId).map((g) => <option key={g.id} value={g.id}>{g.nome}</option>)}
                </select>
              )}
            </Campo>
            <Campo rotulo="Classe (tabela de temporalidade)">
              {(id) => (
                <select id={id} name="classe" required value={classeId} onChange={(e) => setClasseId(e.target.value)} className={caixaCampo}>
                  <option value="">Escolha…</option>
                  {classesDoGrupo.map((r) => <option key={r.id} value={r.id}>{r.codigo} · {r.classe}</option>)}
                </select>
              )}
            </Campo>
            <Campo rotulo="Tipologia documental (opcional)">
              {(id) => (
                <select id={id} name="tipologia" defaultValue={inicial?.tipologiaId ?? ""} key={grupoId} className={caixaCampo}>
                  <option value="">Sem tipologia</option>
                  {tipologiasDoGrupo.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
                </select>
              )}
            </Campo>
          </div>
          {classesDoGrupo.length === 0 && (
            <p role="status" className="text-[13px] text-[#b45309] dark:text-[#fbbf24]">
              Este grupo ainda não tem classe na tabela de temporalidade. Peça ao administrador ou à equipe LicCONT para cadastrar.
            </p>
          )}
          <div className="flex flex-wrap items-end gap-3.5">
            {grupoLic && (
            <div role="radiogroup" aria-label="Tipo" className="inline-flex shrink-0 gap-[3px] rounded-[22px] border border-linha bg-campo p-[3px]">
              {(["licitacao", "contrato"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={tipo === t}
                  tabIndex={tipo === t ? 0 : -1}
                  disabled={!!inicial}
                  onClick={() => setTipo(t)}
                  onKeyDown={(e) => {
                    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return;
                    e.preventDefault();
                    const outro = t === "licitacao" ? "contrato" : "licitacao";
                    setTipo(outro);
                    (e.currentTarget.parentElement?.querySelector(`[data-tipo="${outro}"]`) as HTMLElement | null)?.focus();
                  }}
                  data-tipo={t}
                  className={`min-h-[34px] rounded-[18px] px-[18px] text-[13px] focus-visible:outline-2 focus-visible:outline-foco disabled:opacity-70 ${tipo === t ? "bg-aqua font-semibold text-petroleo" : "text-texto-suave"}`}
                >
                  {t === "licitacao" ? "Licitação" : "Contrato"}
                </button>
              ))}
            </div>
            )}
            {grupoLic && (
            <Campo rotulo={tipo === "licitacao" ? "Modalidade" : "Modalidade (opcional)"} className="min-w-48 flex-1">
              {(id) => (
                <select id={id} name="modalidade" value={modalidade} onChange={(e) => setModalidade(e.target.value)} className={caixaCampo}>
                  <option value="">{tipo === "licitacao" ? "Escolha…" : "Sem modalidade"}</option>
                  {Object.entries(MODALIDADES).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              )}
            </Campo>
            )}
          </div>
          <div className="grid gap-3.5 sm:grid-cols-[1fr_1.4fr]">
            <Campo rotulo={grupoLic ? "Número do processo" : "Número ou protocolo"}>
              {(id) => (
                <input id={id} name="numero" required maxLength={30} defaultValue={inicial?.numero} onChange={(e) => setResumo((s) => ({ ...s, numero: e.target.value }))} placeholder="015/2023" className={caixaCampo} />
              )}
            </Campo>
            <Campo rotulo="Objeto">
              {(id) => (
                <input id={id} name="objeto" required maxLength={2000} defaultValue={inicial?.objeto} onChange={(e) => setResumo((s) => ({ ...s, objeto: e.target.value }))} className={caixaCampo} />
              )}
            </Campo>
          </div>
          <Campo rotulo="Título do processo (opcional)">
            {(id) => (
              <input id={id} name="titulo_processo" maxLength={200} defaultValue={inicial?.tituloProcesso ?? ""} onChange={(e) => setResumo((s) => ({ ...s, titulo: e.target.value }))} className={caixaCampo} />
            )}
          </Campo>
          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-[1.3fr_.6fr_1.2fr]">
            <Campo rotulo="Secretaria">
              {(id) => (
                <>
                  <select id={id} name="secretaria" value={secretaria} onChange={(e) => setSecretaria(e.target.value)} disabled={!!inicial} className={caixaCampo}>
                    {secretarias.map((s) => (
                      <option key={s.id} value={s.id}>{s.nome}</option>
                    ))}
                  </select>
                  {inicial && <input type="hidden" name="secretaria" value={secretaria} />}
                </>
              )}
            </Campo>
            <Campo rotulo="Ano">
              {(id) => (
                <input id={id} name="ano" inputMode="numeric" required maxLength={4} defaultValue={resumo.ano} onChange={(e) => setResumo((s) => ({ ...s, ano: e.target.value }))} className={caixaCampo} />
              )}
            </Campo>
            <Campo rotulo="Órgão">
              {(id) => (
                <EscolhaOrgao id={id} valor={orgaoAtual} aoEscolher={(o) => { setOrgao(o); setOrgaoManual(true); }} />
              )}
            </Campo>
          </div>
          <div className="grid items-start gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            <Campo rotulo="Volume">
              {(id) => <input id={id} name="volume" type="number" min={1} max={99} defaultValue={inicial?.volume ?? 1} className={`${caixaCampo} font-mono`} />}
            </Campo>
            <Campo rotulo="Observação (opcional)" className="sm:col-span-2">
              {(id) => <input id={id} name="observacao" maxLength={300} defaultValue={inicial?.observacao ?? ""} placeholder="Sai na etiqueta do documento" className={caixaCampo} />}
            </Campo>
          </div>
          <PrazoDeGuarda regra={regraAtual} ano={resumo.ano} />
        </section>

        <section className={secao} aria-labelledby="t2">
          <div id="t2"><Titulo n={2}>Onde a caixa está guardada</Titulo></div>
          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            <Campo rotulo="Rua">
              {(id) => (
                <EscolhaRua id={id} ruas={estrutura.ruas} valor={rua} aoEscolher={(v) => { setRua(v); setModulo(""); setNivel(""); setCaixa(""); }} />
              )}
            </Campo>
            <Campo rotulo="Módulo">
              {(id) => (
                <select id={id} value={modulo} disabled={!rua} onChange={(e) => { setModulo(e.target.value); setNivel(""); setCaixa(""); }} className={`${caixaCampo} font-mono`}>
                  <option value="">Escolha…</option>
                  {modulosDaRua.map((m) => (
                    <option key={m.id} value={m.id}>Módulo {m.numero}</option>
                  ))}
                </select>
              )}
            </Campo>
            <Campo rotulo="Nível">
              {(id) => (
                <select id={id} value={nivel} disabled={!modulo} onChange={(e) => { setNivel(e.target.value); setCaixa(""); }} className={`${caixaCampo} font-mono`}>
                  <option value="">Escolha…</option>
                  {niveisDoModulo.map((n) => (
                    <option key={n.id} value={n.id}>Nível {n.numero}</option>
                  ))}
                </select>
              )}
            </Campo>
            <Campo rotulo="Caixa">
              {(id) => (
                <select id={id} value={caixa} disabled={!nivel} onChange={(e) => setCaixa(e.target.value)} className={`${caixaCampo} font-mono`}>
                  <option value="">Escolha…</option>
                  {(nivel ? caixas : []).map((c) => (
                    <option key={c.id} value={c.id}>{`Caixa ${String(c.numero).padStart(2, "0")} · ${c.documentos} de ${c.capacidade}`}</option>
                  ))}
                </select>
              )}
            </Campo>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-linha bg-superficie-2 px-3.5 py-2">
            <p className="text-[13px] text-texto-suave" aria-live="polite">
              {posicao && caixaEscolhida ? (
                <>
                  <b className="font-mono font-medium text-texto">{posicao}</b>
                  {` · ${caixaEscolhida.documentos} ${caixaEscolhida.documentos === 1 ? "documento" : "documentos"}, `}
                  {caixaEscolhida.documentos >= caixaEscolhida.capacidade ? (
                    <span className="font-semibold text-[#b45309] dark:text-[#fbbf24]">a caixa está cheia (capacidade estimada: {caixaEscolhida.capacidade}). Você pode salvar.</span>
                  ) : (
                    `cabem cerca de ${caixaEscolhida.capacidade - caixaEscolhida.documentos}`
                  )}
                </>
              ) : (
                "Escolha a caixa ou use “Próxima livre”."
              )}
            </p>
            <button type="button" onClick={proximaLivre} className="inline-flex h-9 items-center rounded-lg border border-linha px-3 text-[13px] hover:border-destaque focus-visible:outline-2 focus-visible:outline-foco">
              Próxima livre
            </button>
          </div>
        </section>
      </div>

      <div className="flex min-w-0 flex-col gap-3.5">
        <div className={secao}>
          <span className="text-[11px] font-medium tracking-[.05em] text-texto-suave uppercase">Etiqueta da caixa</span>
          <div className="overflow-hidden rounded-xl border border-linha bg-white text-petroleo">
            <div className="flex items-center justify-between px-4 py-3">
              <span className="font-titulo text-[13px] tracking-[1px] uppercase"><span className="font-light">Lic</span><span className="font-bold">Cont</span></span>
              <span className="text-[11px] text-[#3f5e66]">{prefeitura}</span>
            </div>
            <div className="flex bg-petroleo">
              {[["Rua", ruaAtual?.codigo ?? "–"], ["Módulo", moduloAtual?.numero ?? "–"], ["Nível", nivelAtual?.numero ?? "–"], ["Caixa", caixaEscolhida ? String(caixaEscolhida.numero).padStart(2, "0") : "–"]].map(([r, v], i) => (
                <div key={r} className={`min-w-0 flex-1 py-2.5 pl-3.5 ${i < 3 ? "border-r border-white/15" : ""}`}>
                  <div className="text-[9px] font-semibold tracking-[.1em] text-[#8cc5cf] uppercase">{r}</div>
                  <div className={`font-mono text-[22px] leading-7 font-medium ${i === 3 ? "text-aqua" : "text-white"}`}>{v}</div>
                </div>
              ))}
            </div>
            <div className="flex items-stretch gap-3.5 px-4 pt-3.5 pb-4">
              <div className="flex min-w-0 flex-1 flex-col gap-2.5">
                <div>
                  <div className="font-titulo text-[15px] leading-5 font-bold">{resumo.numero ? `${tipo === "contrato" ? "Contrato" : "Licitação"} ${resumo.numero}` : "Título do processo"}</div>
                  <div className="mt-0.5 line-clamp-2 text-xs leading-[17px] text-[#3f5e66]">{resumo.objeto || "Objeto"}</div>
                </div>
                <dl className="grid grid-cols-2 gap-x-3 gap-y-2">
                  {[["Tipo", tipo === "contrato" ? "Contrato" : "Licitação"], ["Ano", resumo.ano || "–"], ["Órgão", orgaoAtual ? ORGAOS[orgaoAtual] : "–"], ["Secretaria", secretarias.find((s) => s.id === secretaria)?.nome ?? "–"]].map(([r, v]) => (
                    <div key={r} className="min-w-0">
                      <dt className="text-[9px] font-semibold tracking-[.1em] text-[#3f5e66] uppercase">{r}</dt>
                      <dd className="mt-px truncate text-[13px] leading-[18px] font-medium text-petroleo">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              <div className="flex flex-col items-center justify-end gap-1">
                {caixaEscolhida && origem ? (
                  <QrSvg texto={urlDaCaixa(origem, caixaEscolhida.id)} tamanho={92} rotulo="QR code da caixa" />
                ) : (
                  <div aria-hidden className="size-[92px] rounded border border-dashed border-[#3f5e66]/40" />
                )}
                <span className="text-[9px] text-[#3f5e66]">Ler para abrir</span>
              </div>
            </div>
          </div>
        </div>

        <section className={secao} aria-labelledby="t3">
          <div id="t3"><Titulo n={3}>Arquivo digital (opcional)</Titulo></div>
          <div
            onDragOver={(e) => { e.preventDefault(); setArrastando(true); }}
            onDragLeave={() => setArrastando(false)}
            onDrop={(e) => { e.preventDefault(); setArrastando(false); void escolherArquivo(e.dataTransfer.files[0] ?? null); }}
            className={`flex items-center gap-3 rounded-xl border-[1.5px] border-dashed px-3.5 py-3 ${arrastando ? "border-aqua bg-[rgba(45,212,191,.12)]" : "border-borda-campo bg-superficie-2"}`}
          >
            <svg aria-hidden width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-destaque">
              <path d="M5 3h9l5 5v13H5z" /><path d="M14 3v5h5M8 14h8M8 18h5" />
            </svg>
            <div className="min-w-0 flex-1">
              <p className="truncate font-mono text-[13px] font-medium">{arquivo ? arquivo.name : inicial?.arquivo ?? "Arraste o PDF para cá"}</p>
              <p className="text-xs text-texto-suave">
                {arquivo ? descreverArquivo("", null, arquivo.size).replace(/^ · /, "") : `Só PDF, até ${limiteMb} MB. O original é guardado sem alteração.`}
              </p>
            </div>
            <input ref={entrada} type="file" accept="application/pdf" aria-label="Escolher o PDF" className="sr-only" onChange={(e) => void escolherArquivo(e.target.files?.[0] ?? null)} />
            <button type="button" onClick={() => entrada.current?.click()} className="h-9 rounded-lg border border-linha px-3 text-[13px] hover:border-destaque focus-visible:outline-2 focus-visible:outline-foco">
              {arquivo || inicial?.arquivo ? "Trocar" : "Escolher"}
            </button>
          </div>
          {avisosPdf.length > 0 && (
            <ul role="status" className="list-disc rounded-lg bg-[#fef3c7] py-2 pr-3 pl-7 text-[13px] text-[#7c2d12] dark:bg-[#3b2f0b] dark:text-[#fcd34d]">
              {avisosPdf.map((a) => <li key={a}>{a}</li>)}
            </ul>
          )}
          {etapa === "Enviando o PDF…" && (
            <div role="progressbar" aria-valuenow={Math.round(progresso * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Envio do PDF" className="h-2 overflow-hidden rounded bg-[#e3eef0] dark:bg-[#05090b]">
              <div className="h-full bg-aqua" style={{ width: `${progresso * 100}%` }} />
            </div>
          )}
        </section>

        {erro && <p id="erro-formulario" role="alert" className="text-sm text-erro">{erro}</p>}
        {aviso && <p role="status" className="rounded-lg border border-linha bg-superficie-2 p-3 text-sm">{aviso}</p>}
        {etapa && <p role="status" className="text-sm text-texto-suave">{etapa}</p>}

        <div className="flex gap-2.5">
          {!inicial && (
            <>
              <button type="submit" name="depois" value="etiqueta" disabled={pendente || !caixa} title={caixa ? undefined : "Escolha a caixa para imprimir a etiqueta"} className={`${botaoBase} flex-1 bg-[linear-gradient(135deg,#0e7490,#0f766e)] text-white hover:opacity-90 dark:bg-none dark:bg-[#2dd4bf] dark:text-[#0b2e3a]`}>
                Salvar e imprimir etiqueta
              </button>
              <button type="submit" name="depois" value="novo" disabled={pendente} className={`${botaoBase} border border-linha hover:border-destaque`}>
                Salvar e novo
              </button>
            </>
          )}
          <button type="submit" name="depois" value="ver" disabled={pendente} className={inicial ? `${botaoBase} flex-1 bg-[linear-gradient(135deg,#0e7490,#0f766e)] text-white hover:opacity-90 dark:bg-none dark:bg-[#2dd4bf] dark:text-[#0b2e3a]` : `${botaoBase} border border-linha hover:border-destaque`}>
            Salvar
          </button>
        </div>
      </div>
    </form>
  );
}
