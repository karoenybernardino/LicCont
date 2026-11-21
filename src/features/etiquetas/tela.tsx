"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Painel } from "@/features/estrutura/componentes";
import { folhasDeCaixas, folhasDeDocumentos, folhasDoConteudo } from "./esquemas";
import { MESES_ABREV, ajustarRotulos, cabeNaEtiqueta, dividirItens, rotulosDosItens, usaLayoutGeral } from "./ajuste";
import type { BaseEtiquetas, CaixaEtiqueta, DocumentoEtiqueta } from "./dados";

// Quadro Etiquetas: o que imprimir (um ou mais tipos), o que etiquetar (caixas e documentos, com filtros),
// prévia da folha e resumo. Cada tipo sai no seu próprio PDF, gerado no servidor a partir do cadastro.
type Tipo = "caixa" | "documento" | "conteudo";
const TIPOS: { id: Tipo; titulo: string; texto: string }[] = [
  { id: "caixa", titulo: "Etiqueta da caixa", texto: "Duas por folha A4 deitada" },
  { id: "documento", titulo: "Etiqueta do documento", texto: "Quatro por folha A4. Vai na capa da pasta." },
  { id: "conteudo", titulo: "Folha de conteúdo da caixa", texto: "A4 em pé. Vai dentro da caixa." },
];
const rotuloMaiusculo = "text-[11px] font-medium tracking-[.05em] text-texto-suave uppercase";
const campoFiltro = "min-h-10 w-full rounded-lg border border-borda-campo bg-campo px-3 text-sm text-texto focus-visible:outline-2 focus-visible:outline-foco";
const SELECIONADO = "bg-[rgba(45,212,191,.18)] dark:bg-[linear-gradient(90deg,rgba(45,212,191,.2),rgba(45,212,191,0))]";
const dataCurta = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit" });

function Caixa({ marcada, aoMudar, rotulo }: { marcada: boolean; aoMudar: () => void; rotulo: string }) {
  return (
    <>
      <input type="checkbox" checked={marcada} onChange={aoMudar} aria-label={rotulo} className="peer sr-only" />
      <span aria-hidden className={`flex size-5 shrink-0 items-center justify-center rounded-md border-[1.5px] peer-focus-visible:outline-2 peer-focus-visible:outline-foco ${marcada ? "border-[#0e7490] bg-[#0e7490]" : "border-borda-campo dark:border-[#1b3a44]"}`}>
        {marcada && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10" /></svg>}
      </span>
    </>
  );
}

function Impressa({ em }: { em: string | null }) {
  return em ? (
    <span className="rounded-xl bg-[#ccfbf1] px-3 py-1 text-xs font-semibold whitespace-nowrap text-[#115e59] dark:bg-[#0e4a45] dark:text-[#7ff0df]">Impressa {dataCurta(em)}</span>
  ) : (
    <span className="rounded-xl bg-[#e3f3f5] px-3 py-1 text-xs font-semibold whitespace-nowrap text-[#0b4f5c] dark:bg-[#0a1418] dark:text-texto-suave">Não impressa</span>
  );
}

const nomeDoOrgao = (o: "prefeitura" | "camara") => (o === "camara" ? "CÂMARA" : "PREFEITURA");

// Prévia aproximada (a folha de verdade é o PDF). Mostra a primeira caixa escolhida, com o mesmo ajuste do PDF:
// todos os itens aparecem (nada de "..." nem "+N itens"); lista grande reduz a fonte e, no mínimo, vira partes.
function PreviaCaixa({ c, dividir }: { c: CaixaEtiqueta | undefined; dividir: boolean }) {
  if (!c) return <p className="py-10 text-center text-sm text-texto-suave">Marque uma caixa para ver a etiqueta.</p>;
  const geral = usaLayoutGeral(c);
  const partes = geral ? [] : dividirItens(c.itens, dividir);
  const itens = partes[0] ?? [];
  const aj = ajustarRotulos(rotulosDosItens(itens));
  const rotulos = rotulosDosItens(itens);
  const esc = 408 / 474; // largura da prévia / largura do cartão
  return (
    <div className="mx-auto flex w-full max-w-[440px] flex-col gap-2 rounded-2xl border border-linha bg-white p-4 text-[#0b2e3a]">
      <div className="flex items-center gap-3">
        <span aria-hidden className="size-12 shrink-0 rounded-lg border border-dashed border-[#cfdde2]" />
        <b className="font-titulo text-[18px] leading-tight break-words">{nomeDoOrgao(c.orgao)}</b>
      </div>
      <div className="h-[5px] rounded bg-[linear-gradient(90deg,#0e7490,#2dd4bf)]" />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <b className="font-titulo text-[22px] break-words">{c.titulo}</b>
        <span className="flex gap-1.5">
          {c.volume && <span className="rounded-full bg-[#0b2e3a] px-3 py-1 text-[11px] font-bold text-white">VOL. {c.volume.n}/{c.volume.total}</span>}
          {partes.length > 1 && <span className="rounded-full bg-[#0b2e3a] px-3 py-1 text-[11px] font-bold text-white">PARTE 1/{partes.length}</span>}
        </span>
      </div>
      {geral && (
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-[11px] text-[#3f5e66]">
          <span>FUNDO<b className="block text-[13px] break-words text-[#0b2e3a]">{c.fundo || "—"}</b></span>
          <span>SETOR<b className="block text-[13px] break-words text-[#0b2e3a]">{c.setor || "—"}</b></span>
        </div>
      )}
      <div className="flex flex-wrap gap-x-6 text-[11px] text-[#3f5e66]">
        <span>CLASSE<b className="block text-[13px] break-words text-[#0b2e3a]">{c.classe}</b></span>
        {c.tipologia && <span>TIPOLOGIA DOCUMENTAL<b className="block text-[13px] break-words text-[#0b2e3a]">{c.tipologia}</b></span>}
      </div>
      {geral ? (
        <>
          <div>
            <span className="text-[11px] text-[#3f5e66]">MESES</span>
            <div className="mt-0.5 grid grid-cols-12 gap-px">
              {MESES_ABREV.map((m, i) => (
                <span key={m} className={`rounded px-0 py-0.5 text-center text-[8px] font-semibold ${c.meses.includes(i + 1) ? "bg-[#0b2e3a] text-white" : "border border-[#cfdde2] text-[#3f5e66]"}`}>{m}</span>
              ))}
            </div>
          </div>
          <div className="flex gap-6 text-[11px] text-[#3f5e66]">
            <span>ANO LIMITE<b className="block text-[13px] text-[#0b2e3a]">{c.anoLimite ?? "—"}</b></span>
            <span>DIGITALIZADO<b className="block text-[13px] text-[#0b2e3a]">{c.digitalizada ? "Sim" : "Não"}</b></span>
          </div>
          <span className="text-[11px] text-[#3f5e66]">OBSERVAÇÕES<b className="block text-[12px] font-semibold break-words text-[#0b2e3a]">{c.observacao || "—"}</b></span>
        </>
      ) : (
        <div>
          <span className="text-[11px] text-[#3f5e66]">{itens.length === 1 ? "PROCESSO" : `PROCESSOS · ${itens.length}`}</span>
          <ul
            aria-label="Processos da caixa"
            className="mt-0.5 grid gap-x-0 font-bold"
            style={{ gridAutoFlow: "column", gridTemplateRows: `repeat(${aj.linhas}, auto)`, gridTemplateColumns: `repeat(${aj.colunas}, minmax(0, 1fr))`, fontSize: `${(aj.tam * esc).toFixed(1)}px`, lineHeight: 1.22 }}
          >
            {rotulos.map((r, n) => <li key={n}>{r}</li>)}
          </ul>
          {partes.length > 1 && <p className="mt-1 text-[11px] text-[#3f5e66]">Lista grande: sai em {partes.length} etiquetas (parte 1/{partes.length} a {partes.length}/{partes.length}).</p>}
        </div>
      )}
      <div className="flex gap-6 rounded-xl bg-[#edf5f7] px-3 py-2 text-[10px] text-[#3f5e66]">
        <span>CÓDIGO<b className="block text-[14px] text-[#0b2e3a]">{c.codigo}</b></span>
        <span>PRAZO DE GUARDA<b className="block text-[12px] break-words text-[#0b2e3a]">{c.prazo}</b></span>
      </div>
      <div className="flex items-center justify-between gap-3 rounded-2xl bg-[#0b2e3a] p-3 text-white">
        <div>
          <b className="font-titulo text-[32px] leading-none"><span className="text-[#2dd4bf]">CX</span> - {c.numero}</b>
          <span className="mt-1 block text-[10px] tracking-wider text-[#9bb8bf]">LOCALIZAÇÃO <span className="rounded-full bg-[#2dd4bf] px-2 py-0.5 font-mono font-bold text-[#0b2e3a]">{c.localizacao}</span></span>
        </div>
        <span aria-hidden className="size-14 shrink-0 rounded-lg bg-white" />
      </div>
    </div>
  );
}

function PreviaDocumento({ d }: { d: DocumentoEtiqueta | undefined }) {
  if (!d) return <p className="py-10 text-center text-sm text-texto-suave">Marque um documento para ver a etiqueta.</p>;
  return (
    <div className="mx-auto flex w-full max-w-[330px] flex-col gap-2 rounded-2xl border border-linha bg-white p-4 text-[#0b2e3a]">
      <div className="h-[5px] rounded bg-[linear-gradient(90deg,#0e7490,#2dd4bf)]" />
      <b className="font-titulo text-[20px] uppercase">{d.titulo}</b>
      {([["SECRETARIA", d.secretaria], ["OBJETO", d.objeto], ["DATA", d.data || "—"], ...(d.observacao ? [["OBSERVAÇÃO", d.observacao]] : [])] as [string, string][]).map(([r, v]) => (
        <span key={r} className="text-[10px] text-[#3f5e66]">{r}<b className="block text-[13px] break-words text-[#0b2e3a]">{v}</b></span>
      ))}
      <div className="flex gap-6 rounded-xl bg-[#edf5f7] px-3 py-2 text-[10px] text-[#3f5e66]">
        <span>CLASSE<b className="block text-[12px] text-[#0b2e3a]">{d.classe}</b></span>
        <span>CÓDIGO<b className="block text-[12px] text-[#0b2e3a]">{d.codigo}</b></span>
      </div>
      <div className="flex items-center justify-between rounded-2xl bg-[#0b2e3a] p-3 text-white">
        <div>
          <b className="font-titulo text-[24px] leading-none"><span className="text-[#2dd4bf]">CX</span> - {d.caixaNumero}</b>
          <span className="mt-1 block text-[10px] tracking-wider text-[#9bb8bf]">GUARDADO EM <span className="rounded-full bg-[#2dd4bf] px-2 py-0.5 font-mono font-bold text-[#0b2e3a]">{d.localizacao}</span></span>
        </div>
        <span aria-hidden className="size-12 shrink-0 rounded-lg bg-white" />
      </div>
    </div>
  );
}

export function TelaEtiquetas({ base, caixasMarcadas, documentosMarcados, podeImprimir }: { base: BaseEtiquetas; caixasMarcadas: string[]; documentosMarcados: string[]; podeImprimir: boolean }) {
  const router = useRouter();
  const [tipos, setTipos] = useState<Set<Tipo>>(() => new Set<Tipo>(documentosMarcados.length && !caixasMarcadas.length ? ["documento"] : ["caixa"]));
  const [aba, setAba] = useState<"caixas" | "documentos">(documentosMarcados.length && !caixasMarcadas.length ? "documentos" : "caixas");
  const [selCaixas, setSelCaixas] = useState(() => new Set(caixasMarcadas.filter((id) => base.caixas.some((c) => c.id === id))));
  const [selDocs, setSelDocs] = useState(() => new Set(documentosMarcados.filter((id) => base.documentos.some((d) => d.id === id))));
  const [busca, setBusca] = useState("");
  const [secretaria, setSecretaria] = useState("");
  const [classe, setClasse] = useState("");
  const [ano, setAno] = useState("");
  const [situacao, setSituacao] = useState<"" | "nunca" | "impressa">("");
  const [previaTipo, setPrevia] = useState<"caixa" | "documento">("caixa");
  const [dividir, setDividir] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  const termo = busca.trim().toLocaleLowerCase("pt-BR");
  const passa = (impressa: string | null) => (situacao === "nunca" ? !impressa : situacao === "impressa" ? !!impressa : true);
  const caixasVisiveis = useMemo(
    () => base.caixas.filter((c) =>
      (!termo || `${c.titulo} ${c.numero} ${c.localizacao} ${c.codigo}`.toLocaleLowerCase("pt-BR").includes(termo)) &&
      (!secretaria || c.secretariaIds.includes(secretaria)) && (!classe || c.classeId === classe) && (!ano || c.anos.includes(Number(ano))) && passa(c.impressa)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [base.caixas, termo, secretaria, classe, ano, situacao],
  );
  const docsVisiveis = useMemo(
    () => base.documentos.filter((d) =>
      (!termo || `${d.titulo} ${d.objeto} ${d.secretaria} ${d.caixaNumero}`.toLocaleLowerCase("pt-BR").includes(termo)) &&
      (!secretaria || d.secretariaId === secretaria) && (!classe || d.classeId === classe) && (!ano || d.ano === Number(ano)) && passa(d.impressa)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [base.documentos, termo, secretaria, classe, ano, situacao],
  );

  const alternar = <T,>(set: Set<T>, id: T, ajustar: (s: Set<T>) => void) => {
    const n = new Set(set);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    ajustar(n);
  };
  const emCaixas = aba === "caixas";
  const visiveisIds = emCaixas ? caixasVisiveis.map((c) => c.id) : docsVisiveis.map((d) => d.id);
  const sel = emCaixas ? selCaixas : selDocs;
  const todasMarcadas = visiveisIds.length > 0 && visiveisIds.every((id) => sel.has(id));
  const marcarTodas = () => {
    const n = new Set(sel);
    for (const id of visiveisIds) {
      if (todasMarcadas) n.delete(id);
      else n.add(id);
    }
    (emCaixas ? setSelCaixas : setSelDocs)(n);
  };

  const escolhidasCaixas = base.caixas.filter((c) => selCaixas.has(c.id));
  const escolhidasDocs = base.documentos.filter((d) => selDocs.has(d.id));
  const usaCaixas = tipos.has("caixa") || tipos.has("conteudo");
  const nCaixa = tipos.has("caixa") ? escolhidasCaixas.length : 0;
  // Etiquetas de verdade na folha: caixa de lista grande vira partes (1/2, 2/2).
  const etiquetasCaixa = tipos.has("caixa") ? escolhidasCaixas.reduce((s, c) => s + (usaLayoutGeral(c) ? 1 : dividirItens(c.itens, dividir).length), 0) : 0;
  const listaGrande = tipos.has("caixa") && escolhidasCaixas.some((c) => !usaLayoutGeral(c) && !cabeNaEtiqueta(c.itens));
  const nDoc = tipos.has("documento") ? escolhidasDocs.length : 0;
  const folhasConteudo = tipos.has("conteudo") ? escolhidasCaixas.reduce((s, c) => s + folhasDoConteudo(c.itens.length), 0) : 0;
  const folhas = folhasDeCaixas(etiquetasCaixa) + folhasDeDocumentos(nDoc) + folhasConteudo;
  const total = nCaixa + nDoc + (tipos.has("conteudo") ? escolhidasCaixas.length : 0);
  void usaCaixas;

  // Um PDF por tipo escolhido.
  async function gerar(abrir: boolean) {
    setAviso(null);
    const feitos: string[] = [];
    for (const t of tipos) {
      const r = await fetch("/etiquetas/pdf", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ tipos: [t], caixas: t === "documento" ? [] : [...selCaixas], documentos: t === "documento" ? [...selDocs] : [], dividir }),
      });
      if (!r.ok) {
        setAviso(await r.text().catch(() => "Não foi possível gerar o PDF."));
        continue;
      }
      const url = URL.createObjectURL(await r.blob());
      if (abrir) window.open(url, "_blank", "noopener");
      else {
        const a = document.createElement("a");
        a.href = url;
        a.download = `${t === "caixa" ? "etiquetas-das-caixas" : t === "conteudo" ? "folhas-de-conteudo" : "etiquetas-dos-documentos"}.pdf`;
        a.click();
      }
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      feitos.push(t);
    }
    if (feitos.length) router.refresh();
  }
  const podeGerar = podeImprimir && total > 0 && !pendente;

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[1fr_1.15fr]">
      <div className="flex min-w-0 flex-col gap-4">
        <Painel>
          <span className={rotuloMaiusculo}>O que imprimir</span>
          <p className="text-[13px] text-texto-suave">Marque um ou mais tipos. Cada um sai no seu próprio PDF.</p>
          <div className="flex flex-col gap-2.5">
            {TIPOS.map((t) => (
              <label key={t.id} className={`relative flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-foco ${tipos.has(t.id) ? `border-[#0e7490] ${SELECIONADO}` : "border-linha"}`}>
                <Caixa marcada={tipos.has(t.id)} aoMudar={() => alternar(tipos, t.id, setTipos)} rotulo={t.titulo} />
                <span><b className="block text-[15px]">{t.titulo}</b><span className="text-[13px] text-texto-suave">{t.texto}</span></span>
              </label>
            ))}
          </div>
          <p className="text-[12.5px] text-texto-suave">O logo da prefeitura vem do cadastro do órgão. O da empresa parceira vem do cadastro da prefeitura. O LicCONT é fixo no rodapé.</p>
        </Painel>

        <Painel>
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-titulo text-[17px] font-bold">O que etiquetar</h2>
            <span aria-live="polite" className="rounded-xl bg-[#ccfbf1] px-2.5 py-1 text-xs font-semibold whitespace-nowrap text-[#115e59] dark:bg-[#0e4a45] dark:text-[#7ff0df]">{total} {total === 1 ? "etiqueta" : "etiquetas"}</span>
          </div>
          <div role="tablist" aria-label="Caixas ou documentos" className="inline-flex gap-[3px] rounded-xl border border-linha bg-campo p-[3px]">
            {([["caixas", `Caixas · ${selCaixas.size} ${selCaixas.size === 1 ? "marcada" : "marcadas"}`], ["documentos", `Documentos · ${selDocs.size} ${selDocs.size === 1 ? "marcado" : "marcados"}`]] as const).map(([v, r]) => (
              <button key={v} role="tab" type="button" aria-selected={aba === v} onClick={() => { setAba(v); setPrevia(v === "caixas" ? "caixa" : "documento"); }} className={`min-h-9 rounded-[10px] border px-3.5 text-[13px] focus-visible:outline-2 focus-visible:outline-foco ${aba === v ? `border-[#0e7490] font-semibold ${SELECIONADO}` : "border-transparent"}`}>{r}</button>
            ))}
          </div>
          <input value={busca} onChange={(e) => setBusca(e.target.value)} maxLength={60} aria-label="Buscar caixa ou documento" placeholder="Buscar caixa ou documento" className={campoFiltro} />
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1"><span className={rotuloMaiusculo}>Secretaria</span>
              <select value={secretaria} onChange={(e) => setSecretaria(e.target.value)} className={campoFiltro}><option value="">Todas</option>{base.secretarias.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}</select></label>
            <label className="flex flex-col gap-1"><span className={rotuloMaiusculo}>Classe</span>
              <select value={classe} onChange={(e) => setClasse(e.target.value)} className={campoFiltro}><option value="">Todas</option>{base.classes.map((c) => <option key={c.id} value={c.id}>{c.codigo} · {c.nome}</option>)}</select></label>
            <label className="flex flex-col gap-1"><span className={rotuloMaiusculo}>Ano</span>
              <select value={ano} onChange={(e) => setAno(e.target.value)} className={campoFiltro}><option value="">Todos</option>{base.anos.map((a) => <option key={a} value={a}>{a}</option>)}</select></label>
            <label className="flex flex-col gap-1"><span className={rotuloMaiusculo}>Etiqueta</span>
              <select value={situacao} onChange={(e) => setSituacao(e.target.value as typeof situacao)} className={campoFiltro}><option value="">Todas</option><option value="nunca">Ainda não impressa</option><option value="impressa">Já impressa</option></select></label>
          </div>
          <label className="relative flex items-center gap-3 px-3 py-1 text-[12px] font-medium tracking-wider text-texto-suave uppercase">
            <Caixa marcada={todasMarcadas} aoMudar={marcarTodas} rotulo="Marcar todas as que aparecem" />
            {emCaixas ? "Caixa" : "Documento"}
            <span className="ml-auto">Etiqueta</span>
          </label>
          <ul className="flex max-h-[340px] flex-col gap-1 overflow-auto pr-1.5">
            {emCaixas && caixasVisiveis.map((c) => (
              <li key={c.id}>
                <label className={`relative flex cursor-pointer items-center gap-3 rounded-[10px] px-3 py-2.5 hover:shadow-[inset_0_0_0_1.5px_var(--foco)] ${selCaixas.has(c.id) ? SELECIONADO : ""}`}>
                  <Caixa marcada={selCaixas.has(c.id)} aoMudar={() => alternar(selCaixas, c.id, setSelCaixas)} rotulo={`Caixa ${c.numero}`} />
                  <span className="min-w-0 flex-1"><b className="font-titulo text-[13px]">CX - {c.numero}</b><span className="text-[13px] text-texto-suave"> · {c.orgao === "camara" ? "Câmara · " : ""}{c.titulo}{c.volume ? ` · Vol. ${c.volume.n}/${c.volume.total}` : ""}</span><span className="block text-[12px] text-texto-suave">{c.localizacao}</span></span>
                  <Impressa em={c.impressa} />
                </label>
              </li>
            ))}
            {!emCaixas && docsVisiveis.map((d) => (
              <li key={d.id}>
                <label className={`relative flex cursor-pointer items-center gap-3 rounded-[10px] px-3 py-2.5 hover:shadow-[inset_0_0_0_1.5px_var(--foco)] ${selDocs.has(d.id) ? SELECIONADO : ""}`}>
                  <Caixa marcada={selDocs.has(d.id)} aoMudar={() => alternar(selDocs, d.id, setSelDocs)} rotulo={d.titulo} />
                  <span className="min-w-0 flex-1"><b className="font-titulo text-[13px]">{d.titulo}</b><span className="block text-[12px] break-words text-texto-suave">{d.secretaria} · CX - {d.caixaNumero}</span></span>
                  <Impressa em={d.impressa} />
                </label>
              </li>
            ))}
            {visiveisIds.length === 0 && <li className="px-3 py-2.5 text-sm text-texto-suave">{emCaixas ? "Nenhuma caixa encontrada." : "Nenhum documento encontrado."}</li>}
          </ul>
          <p className="text-[12.5px] text-texto-suave">Os filtros valem para caixas e documentos. Em Documentos, a lista mostra modalidade, número/ano e secretaria.</p>
        </Painel>
      </div>

      <div className="flex min-w-0 flex-col gap-4">
        <Painel>
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-titulo text-[17px] font-bold">Prévia da folha</h2>
            <span className="text-xs text-texto-suave">Aproximada: o PDF é a folha de verdade</span>
          </div>
          <div role="tablist" aria-label="Prévia" className="inline-flex gap-[3px] rounded-xl border border-linha bg-campo p-[3px]">
            {([["caixa", "Etiqueta da caixa"], ["documento", "Etiqueta do documento"]] as const).map(([v, r]) => (
              <button key={v} role="tab" type="button" aria-selected={previaTipo === v} onClick={() => setPrevia(v)} className={`min-h-9 rounded-[10px] border px-3.5 text-[13px] focus-visible:outline-2 focus-visible:outline-foco ${previaTipo === v ? `border-[#0e7490] font-semibold ${SELECIONADO}` : "border-transparent"}`}>{r}</button>
            ))}
          </div>
          <div className="rounded-xl bg-[#f4f7f8] p-4 dark:bg-[#0b1418]">
            {previaTipo === "caixa" ? <PreviaCaixa c={escolhidasCaixas[0]} dividir={dividir} /> : <PreviaDocumento d={escolhidasDocs[0]} />}
          </div>
          <p className="text-[12.5px] text-texto-suave">Volume e tipologia só aparecem quando existem. Todos os itens aparecem: se a lista for grande, a fonte diminui e, no mínimo, ela continua em outra etiqueta (parte 1/2, 2/2).</p>
        </Painel>
        {listaGrande && (
          <label className="relative flex cursor-pointer items-start gap-3 rounded-xl border border-linha px-4 py-3 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-foco">
            <Caixa marcada={dividir} aoMudar={() => setDividir((v) => !v)} rotulo="Dividir em partes" />
            <span>
              <b className="block text-[15px]">Dividir em partes (parte 1/2 e 2/2)</b>
              <span className="text-[13px] text-texto-suave">Há caixa com tantos processos que não cabe numa etiqueta na fonte mínima. Dividindo, as partes ficam iguais e a letra maior. Sem marcar, enche cada etiqueta e continua na seguinte. Nada é cortado.</span>
            </span>
          </label>
        )}
        <Painel>
          <span className={rotuloMaiusculo}>Resumo da impressão</span>
          <dl className="flex flex-col gap-2.5 text-[15px]">
            {([
              ["Etiquetas das caixas", tipos.has("caixa") ? `${nCaixa} ${nCaixa === etiquetasCaixa ? "" : `(${etiquetasCaixa} com as partes) `}→ ${folhasDeCaixas(etiquetasCaixa)} ${folhasDeCaixas(etiquetasCaixa) === 1 ? "folha A4 deitada" : "folhas A4 deitadas"}` : "não marcada"],
              ["Etiquetas dos documentos", tipos.has("documento") ? `${nDoc} → ${folhasDeDocumentos(nDoc)} ${folhasDeDocumentos(nDoc) === 1 ? "folha A4" : "folhas A4"}` : "não marcada"],
              ["Folha de conteúdo", tipos.has("conteudo") ? `${escolhidasCaixas.length} ${escolhidasCaixas.length === 1 ? "caixa" : "caixas"} → ${folhasConteudo} ${folhasConteudo === 1 ? "folha" : "folhas"}` : "não marcada"],
              ["Total de folhas", String(folhas)],
            ] as const).map(([r, v]) => (
              <div key={r} className="flex justify-between gap-3"><dt className="text-texto-suave">{r}</dt><dd className="font-medium">{v}</dd></div>
            ))}
          </dl>
          <p className="text-[12.5px] text-texto-suave">Quem imprimiu e quando fica na auditoria. A etiqueta muda sozinha se a caixa mudar de lugar ou de conteúdo.</p>
        </Painel>
        {aviso && <p role="alert" className="rounded-lg border border-linha bg-superficie-2 p-3 text-sm">{aviso}</p>}
        <div className="flex justify-end gap-2.5">
          <button type="button" disabled={!podeGerar} onClick={() => iniciar(() => gerar(false))} className="inline-flex min-h-10 items-center justify-center rounded-lg border border-linha px-5 text-sm font-medium hover:border-destaque focus-visible:outline-2 focus-visible:outline-foco disabled:cursor-not-allowed disabled:opacity-50">
            {pendente ? "Gerando…" : "Baixar PDF"}
          </button>
          <button
            type="button"
            disabled={!podeGerar}
            title={podeImprimir ? undefined : "Você não tem permissão para imprimir etiquetas"}
            onClick={() => iniciar(() => gerar(true))}
            className="inline-flex min-h-10 items-center justify-center rounded-lg bg-[linear-gradient(135deg,#0e7490,#0f766e)] px-5 text-sm font-semibold text-white hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco disabled:cursor-not-allowed disabled:opacity-50 dark:bg-none dark:bg-[#2dd4bf] dark:text-[#0b2e3a]"
          >
            Imprimir {total} {total === 1 ? "etiqueta" : "etiquetas"}
          </button>
        </div>
      </div>
    </div>
  );
}
