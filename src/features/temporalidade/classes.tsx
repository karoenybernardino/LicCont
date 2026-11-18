"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Girando } from "@/ui/carregando";
import { excluirClasse, lerTabelaEnviada, salvarClasses } from "./classes-acoes";
import { conferirLinhas, gerarModeloXlsx, montarLinhas, paraBanco, textoContagem, textoPrazo, type LinhaClasse } from "./classes-tabela";
import { TIPOS_PRAZO, type Regra, type TipoPrazo } from "./regras";
import { AVISO_AMBAR, BLOCO, BOTAO_CONTORNO, BOTAO_PRIMARIO, CAMPO, LINHA, ROTULO, SELECAO, SUAVE, TXT } from "./ui";

// Tabela de temporalidade do órgão (quadro EquipePrefeituraLogo*): lista, "Nova linha"
// e "Importar planilha". Serve à equipe LicCONT (qualquer órgão) e ao administrador do órgão.
type Grupo = { id: string; nome: string };

const campo = `min-h-10 w-full rounded-lg border ${LINHA} ${CAMPO} px-3 text-sm outline-0 focus-visible:outline-2 focus-visible:outline-[#0e7490] dark:focus-visible:outline-[#2dd4bf] ${TXT}`;
const campoPequeno = `min-h-8 w-full rounded-md border ${LINHA} ${CAMPO} px-2 text-[13px] outline-0 focus-visible:outline-2 focus-visible:outline-[#0e7490] ${TXT}`;
const janelaClasse = `m-auto max-w-[94vw] flex-col gap-4 rounded-2xl border bg-[rgba(255,255,255,.92)] px-6 py-[22px] shadow-[0_30px_80px_rgba(0,0,0,.45)] backdrop:bg-[rgba(11,46,58,.38)] backdrop:backdrop-blur-[2px] open:flex dark:bg-[#0d1a1f] dark:backdrop:bg-[rgba(0,0,0,.62)] ${LINHA} ${TXT}`;

const vazia = (grupo: string): LinhaClasse => ({ codigo: "", nome: "", grupo, tipologias: "", corrente: 5, intermediaria: 0, tipoPrazo: "fixo", evento: "", destinacao: "eliminacao", observacao: "" });
const dePrazo = (r: Regra): LinhaClasse => ({ codigo: r.codigo, nome: r.classe, grupo: r.grupo, tipologias: "", corrente: r.corrente, intermediaria: r.intermediaria, tipoPrazo: r.tipoPrazo, evento: r.evento ?? "", destinacao: r.destinacao, observacao: r.observacao ?? "" });

function Fechar({ aoFechar }: { aoFechar: () => void }) {
  return (
    <button type="button" aria-label="Fechar" onClick={aoFechar} className={`flex size-[34px] items-center justify-center rounded-[9px] border ${LINHA} hover:border-[#0e7490] dark:hover:border-[#2dd4bf]`}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>
    </button>
  );
}

function Rot({ texto, children, className = "" }: { texto: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`flex min-w-0 flex-col gap-[5px] ${className}`}>
      <span className={ROTULO}>{texto}</span>
      {children}
    </label>
  );
}

// Campos de uma classe (usado na janela de uma linha e na prévia da importação).
function CamposClasse({ valor, aoMudar, grupos }: { valor: LinhaClasse; aoMudar: (l: LinhaClasse) => void; grupos: Grupo[] }) {
  const set = <K extends keyof LinhaClasse>(k: K, v: LinhaClasse[K]) => aoMudar({ ...valor, [k]: v });
  const trocarTipo = (t: TipoPrazo) =>
    aoMudar({ ...valor, tipoPrazo: t, destinacao: t === "permanente" ? "guarda_permanente" : "eliminacao", evento: t === "apos_evento" ? valor.evento : "" });
  return (
    <>
      <div className="grid gap-3.5 sm:grid-cols-[120px_1fr]">
        <Rot texto="Código"><input value={valor.codigo} maxLength={20} onChange={(e) => set("codigo", e.target.value)} className={`${campo} font-mono`} /></Rot>
        <Rot texto="Classe"><input value={valor.nome} maxLength={160} onChange={(e) => set("nome", e.target.value)} className={campo} /></Rot>
      </div>
      <Rot texto="Grupo documental">
        <select value={valor.grupo} onChange={(e) => set("grupo", e.target.value)} className={campo}>
          <option value="">Escolha…</option>
          {grupos.map((g) => <option key={g.id} value={g.nome}>{g.nome}</option>)}
        </select>
      </Rot>
      <fieldset className="flex flex-col gap-2">
        <legend className={ROTULO}>Como conta o prazo</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {(Object.keys(TIPOS_PRAZO) as TipoPrazo[]).map((t) => (
            <label key={t} className={`flex cursor-pointer items-center gap-2 rounded-[10px] border px-3 py-2 text-sm font-medium has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[#0e7490] ${valor.tipoPrazo === t ? `border-[#0e7490] dark:border-[#2dd4bf] ${SELECAO}` : LINHA}`}>
              <input type="radio" name="tipo_prazo" checked={valor.tipoPrazo === t} onChange={() => trocarTipo(t)} className="accent-[#0e7490]" />
              {TIPOS_PRAZO[t]}
            </label>
          ))}
        </div>
      </fieldset>
      {valor.tipoPrazo !== "permanente" && (
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Rot texto="Fase corrente (anos)"><input type="number" min={0} max={99} value={valor.corrente} onChange={(e) => set("corrente", Number(e.target.value))} className={`${campo} font-mono`} /></Rot>
          <Rot texto="Fase intermediária (anos)"><input type="number" min={0} max={99} value={valor.intermediaria} onChange={(e) => set("intermediaria", Number(e.target.value))} className={`${campo} font-mono`} /></Rot>
        </div>
      )}
      {valor.tipoPrazo === "apos_evento" && (
        <Rot texto="Evento que inicia a contagem"><input value={valor.evento} maxLength={80} placeholder="Término do contrato" onChange={(e) => set("evento", e.target.value)} className={campo} /></Rot>
      )}
      {valor.tipoPrazo === "fixo" && <p className={`text-xs ${SUAVE}`}>O prazo conta da data em que o documento foi feito.</p>}
      <Rot texto="Tipologias (opcional, separe por ;)"><input value={valor.tipologias} maxLength={500} onChange={(e) => set("tipologias", e.target.value)} className={campo} /></Rot>
      <Rot texto="Observação (opcional)"><input value={valor.observacao} maxLength={500} onChange={(e) => set("observacao", e.target.value)} className={campo} /></Rot>
    </>
  );
}

function DialogoLinha({ prefeitura, grupos, edicao, aoFechar }: { prefeitura: string; grupos: Grupo[]; edicao: Regra | null; aoFechar: () => void }) {
  const router = useRouter();
  const [valor, setValor] = useState<LinhaClasse>(edicao ? dePrazo(edicao) : vazia(grupos[0]?.nome ?? ""));
  const [msg, setMsg] = useState<{ erro?: string; aviso?: string } | null>(null);
  const [pendente, iniciar] = useTransition();
  const erros = conferirLinhas([valor], grupos.map((g) => g.nome))[0];

  const salvar = () =>
    iniciar(async () => {
      if (erros.length) return setMsg({ erro: erros[0] });
      const r = await salvarClasses({ prefeitura, linhas: paraBanco([valor]), substituir: false });
      if (r.erro) return setMsg({ erro: r.erro });
      router.refresh();
      aoFechar();
    });
  const excluir = () =>
    iniciar(async () => {
      if (!edicao) return;
      const r = await excluirClasse({ id: edicao.id });
      if (r.erro) return setMsg({ erro: r.erro });
      router.refresh();
      aoFechar();
    });

  return (
    <div className="flex w-[560px] max-w-full flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className={`text-xs ${SUAVE}`}>Tabela de temporalidade</div>
          <h2 className="mt-0.5 font-[family-name:var(--font-titulo)] text-[19px] font-bold">{edicao ? "Editar classe" : "Nova classe"}</h2>
        </div>
        <Fechar aoFechar={aoFechar} />
      </div>
      <CamposClasse valor={valor} aoMudar={setValor} grupos={grupos} />
      {(msg?.erro || (erros.length > 0 && valor.codigo)) && <p role="alert" className="text-sm font-medium text-[#b91c1c] dark:text-[#fca5a5]">{msg?.erro ?? erros[0]}</p>}
      <div className="flex items-center justify-between gap-2.5">
        {edicao ? <button type="button" onClick={excluir} disabled={pendente} className={BOTAO_CONTORNO}>Excluir</button> : <span />}
        <div className="flex gap-2.5">
          <button type="button" onClick={aoFechar} className={BOTAO_CONTORNO}>Cancelar</button>
          <button type="button" onClick={salvar} disabled={pendente} className={BOTAO_PRIMARIO}>{pendente ? <Girando /> : "Salvar classe"}</button>
        </div>
      </div>
      {edicao && <p className={`text-xs ${SUAVE}`}>Classe com caixa ou documento ligado não é excluída: fica desativada.</p>}
    </div>
  );
}

type Previa = { linhas: LinhaClasse[]; duvidosas: boolean[]; arquivo: string; paginasOcr: number };

function DialogoImportar({ prefeitura, grupos, aoFechar }: { prefeitura: string; grupos: Grupo[]; aoFechar: () => void }) {
  const router = useRouter();
  const [previa, setPrevia] = useState<Previa | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [lendo, setLendo] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const nomes = grupos.map((g) => g.nome);
  const erros = previa ? conferirLinhas(previa.linhas, nomes) : [];
  const comErro = erros.filter((e) => e.length).length;

  async function ler(f: File | undefined) {
    if (!f) return;
    setMsg(null);
    setPrevia(null);
    const ext = f.name.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1];
    if (ext === "pdf") {
      setLendo("Lendo o PDF…");
      try {
        const { lerTabelaDoPdf } = await import("./classes-pdf");
        const t = await lerTabelaDoPdf(f, (p, total) => setLendo(`Lendo a página ${p} de ${total}…`));
        const r = montarLinhas(t.cabecalhos, t.linhas, "");
        setLendo(null);
        if (r.semColunas.length || !r.linhas.length) return setMsg("Não consegui achar a tabela neste PDF. Use o modelo em planilha ou cadastre à mão.");
        setPrevia({ linhas: r.linhas, duvidosas: t.duvidosas.slice(0, r.linhas.length), arquivo: "PDF", paginasOcr: t.paginasOcr });
      } catch {
        setLendo(null);
        setMsg("Não foi possível ler o PDF. Confira se o arquivo não está corrompido ou com senha.");
      }
      return;
    }
    setLendo("Lendo a planilha…");
    const dados = new FormData();
    dados.set("arquivo", f);
    const t = await lerTabelaEnviada(dados);
    setLendo(null);
    if (t.erro || !t.cabecalhos || !t.linhas) return setMsg(t.erro ?? "Não foi possível ler a planilha.");
    const r = montarLinhas(t.cabecalhos, t.linhas, "");
    if (r.semColunas.length) return setMsg(`Faltam colunas na planilha: ${r.semColunas.join(", ")}. Use o modelo.`);
    if (!r.linhas.length) return setMsg("A planilha não tem linhas.");
    setPrevia({ linhas: r.linhas, duvidosas: [], arquivo: ext === "csv" ? "CSV" : "XLSX", paginasOcr: 0 });
  }

  const salvar = (substituir: boolean) =>
    iniciar(async () => {
      if (!previa) return;
      if (comErro) return setMsg("Corrija as linhas marcadas antes de salvar.");
      const r = await salvarClasses({ prefeitura, linhas: paraBanco(previa.linhas), substituir });
      if (r.erro) return setMsg(r.erro);
      router.refresh();
      aoFechar();
    });

  const mudar = (i: number, l: LinhaClasse) => setPrevia((p) => (p ? { ...p, linhas: p.linhas.map((x, n) => (n === i ? l : x)), duvidosas: p.duvidosas.map((d, n) => (n === i ? false : d)) } : p));
  const baixarModelo = () => {
    const url = URL.createObjectURL(new Blob([gerarModeloXlsx(nomes).slice().buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "modelo-tabela-de-temporalidade.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex w-[980px] max-w-full flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className={`text-xs ${SUAVE}`}>Tabela de temporalidade</div>
          <h2 className="mt-0.5 font-[family-name:var(--font-titulo)] text-[19px] font-bold">Importar tabela</h2>
        </div>
        <Fechar aoFechar={aoFechar} />
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        <button type="button" onClick={baixarModelo} className={BOTAO_CONTORNO}>Baixar modelo (.xlsx)</button>
        <label className={`${BOTAO_PRIMARIO} cursor-pointer`}>
          Enviar tabela
          <input type="file" accept=".xlsx,.csv,.pdf" className="sr-only" onChange={(e) => ler(e.target.files?.[0])} />
        </label>
        <span className={`text-xs ${SUAVE}`}>Aceita .xlsx, .csv e PDF (inclusive escaneado). Nada sai do seu computador no PDF.</span>
      </div>
      {lendo && <p role="status" className="flex items-center gap-2 text-sm"><Girando /> {lendo}</p>}
      {msg && <p role="alert" className="text-sm font-medium text-[#b91c1c] dark:text-[#fca5a5]">{msg}</p>}
      {previa && (
        <>
          <div className={`rounded-[10px] border px-3.5 py-2.5 text-[13px] ${AVISO_AMBAR}`}>
            Confira antes de salvar. {previa.arquivo === "PDF" ? "A leitura do PDF pode errar" + (previa.paginasOcr ? ` (${previa.paginasOcr} página${previa.paginasOcr === 1 ? "" : "s"} lida${previa.paginasOcr === 1 ? "" : "s"} por OCR)` : "") + ". Linhas em amarelo têm leitura duvidosa. " : ""}
            {previa.linhas.length} linhas, {comErro} com erro.
          </div>
          <div className="max-h-[46vh] overflow-auto rounded-[10px] border border-inherit">
            <table className="w-full min-w-[860px] border-collapse text-left">
              <thead>
                <tr className={`${ROTULO}`}>
                  {["Código", "Classe", "Grupo", "Prazo", "Tipo", "Evento", "Destinação", "Problema"].map((c) => <th key={c} scope="col" className="sticky top-0 bg-[#edf5f7] px-2 py-2 dark:bg-[#0a181c]">{c}</th>)}
                </tr>
              </thead>
              <tbody>
                {previa.linhas.map((l, i) => {
                  const e = erros[i] ?? [];
                  const fundo = e.length ? "bg-[rgba(220,38,38,.10)]" : previa.duvidosas[i] ? "bg-[rgba(255,159,28,.14)]" : "";
                  const set = (k: keyof LinhaClasse, v: string | number) => mudar(i, { ...l, [k]: v } as LinhaClasse);
                  return (
                    <tr key={i} className={`${fundo} align-top`}>
                      <td className="p-1"><input aria-label="Código" value={l.codigo} onChange={(x) => set("codigo", x.target.value)} className={`${campoPequeno} w-20 font-mono`} /></td>
                      <td className="p-1"><input aria-label="Classe" value={l.nome} onChange={(x) => set("nome", x.target.value)} className={campoPequeno} /></td>
                      <td className="p-1">
                        <select aria-label="Grupo" value={l.grupo} onChange={(x) => set("grupo", x.target.value)} className={campoPequeno}>
                          <option value="">—</option>
                          {l.grupo && !nomes.some((n) => n.toLowerCase() === l.grupo.toLowerCase()) && <option value={l.grupo}>{l.grupo} (não cadastrado)</option>}
                          {nomes.map((n) => <option key={n} value={n}>{n}</option>)}
                        </select>
                      </td>
                      <td className="p-1"><input aria-label="Prazo em anos" type="number" min={0} max={99} value={l.corrente + l.intermediaria} onChange={(x) => mudar(i, { ...l, corrente: Number(x.target.value), intermediaria: 0 })} disabled={l.tipoPrazo === "permanente"} className={`${campoPequeno} w-16 font-mono`} /></td>
                      <td className="p-1">
                        <select aria-label="Tipo de prazo" value={l.tipoPrazo} onChange={(x) => { const t = x.target.value as TipoPrazo; mudar(i, { ...l, tipoPrazo: t, destinacao: t === "permanente" ? "guarda_permanente" : "eliminacao", evento: t === "apos_evento" ? l.evento : "" }); }} className={campoPequeno}>
                          {(Object.keys(TIPOS_PRAZO) as TipoPrazo[]).map((t) => <option key={t} value={t}>{TIPOS_PRAZO[t]}</option>)}
                        </select>
                      </td>
                      <td className="p-1"><input aria-label="Evento" value={l.evento} disabled={l.tipoPrazo !== "apos_evento"} onChange={(x) => set("evento", x.target.value)} className={campoPequeno} /></td>
                      <td className="p-1 text-[13px] whitespace-nowrap">{l.destinacao === "guarda_permanente" ? "Guarda permanente" : "Eliminação"}</td>
                      <td className="p-1 text-xs text-[#b91c1c] dark:text-[#fca5a5]">{e.join(" ")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2.5">
            <span className={`mr-auto text-xs ${SUAVE}`}>Substituir apaga as classes que não vieram no arquivo (as que já têm caixa ou documento só ficam desativadas).</span>
            <button type="button" disabled={pendente || comErro > 0} onClick={() => salvar(false)} className={BOTAO_CONTORNO}>Só acrescentar novas e atualizar</button>
            <button type="button" disabled={pendente || comErro > 0} onClick={() => salvar(true)} className={BOTAO_PRIMARIO}>{pendente ? <Girando /> : "Substituir a tabela"}</button>
          </div>
        </>
      )}
    </div>
  );
}

export function EditorClasses({ prefeitura, classes, grupos, rotuloNota }: { prefeitura: string; classes: Regra[]; grupos: Grupo[]; rotuloNota?: string }) {
  const janela = useRef<HTMLDialogElement>(null);
  const [modo, setModo] = useState<{ tipo: "linha"; edicao: Regra | null } | { tipo: "importar" } | null>(null);
  const abrir = (m: NonNullable<typeof modo>) => {
    setModo(m);
    janela.current?.showModal();
  };
  const fechar = () => {
    janela.current?.close();
    setModo(null);
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-end gap-2.5">
        <button type="button" className={BOTAO_CONTORNO} onClick={() => abrir({ tipo: "importar" })}>Importar planilha</button>
        <button type="button" className={BOTAO_PRIMARIO} onClick={() => abrir({ tipo: "linha", edicao: null })}>+ Nova linha</button>
      </div>
      <div className="-mx-5 overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <caption className="sr-only">Tabela de temporalidade do órgão</caption>
          <thead>
            <tr className="bg-[#edf5f7] dark:bg-[#0a181c]">
              {["Código", "Classe", "Prazo", "Contagem a partir de", ""].map((c, n) => <th key={n} scope="col" className={`h-[38px] px-5 text-[11px] font-semibold tracking-[.05em] uppercase ${SUAVE}`}>{c || <span className="sr-only">Ações</span>}</th>)}
            </tr>
          </thead>
          <tbody>
            {classes.length === 0 && <tr><td colSpan={5} className={`px-5 py-6 text-sm ${SUAVE}`}>Nenhuma classe cadastrada. Importe uma planilha ou cadastre à mão.</td></tr>}
            {classes.map((r, i) => (
              <tr key={r.id} className={`${i % 2 ? BLOCO : ""} ${r.ativa ? "" : "opacity-55"}`}>
                <td className="h-14 px-5 font-mono text-sm">{r.codigo}</td>
                <td className="h-14 px-5 text-sm font-semibold">{r.classe}{!r.ativa && <span className={`ml-2 text-xs font-normal ${SUAVE}`}>(desativada)</span>}<span className={`block text-xs font-normal ${SUAVE}`}>{r.grupo}</span></td>
                <td className="h-14 px-5 text-sm whitespace-nowrap">{textoPrazo(r)}</td>
                <td className="h-14 px-5 text-sm">{textoContagem(r)}</td>
                <td className="h-14 px-5 text-right"><button type="button" onClick={() => abrir({ tipo: "linha", edicao: r })} className="text-sm font-semibold text-[#0e7490] hover:underline dark:text-[#2dd4bf]">Editar</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={`text-[12.5px] ${SUAVE}`}>{rotuloNota ?? "Cada classe da árvore de classificação do órgão usa uma linha daqui. O código e o prazo saem na etiqueta da caixa e do documento."}</p>
      <dialog ref={janela} aria-label="Tabela de temporalidade" onClose={() => setModo(null)} className={janelaClasse}>
        {modo?.tipo === "linha" && <DialogoLinha key={modo.edicao?.id ?? "nova"} prefeitura={prefeitura} grupos={grupos} edicao={modo.edicao} aoFechar={fechar} />}
        {modo?.tipo === "importar" && <DialogoImportar prefeitura={prefeitura} grupos={grupos} aoFechar={fechar} />}
      </dialog>
    </>
  );
}
