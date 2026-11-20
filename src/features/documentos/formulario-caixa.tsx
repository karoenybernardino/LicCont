"use client";

import type { TipologiaDoc } from "@/features/demo/classificacao";
import type { Regra } from "@/features/temporalidade/regras";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { classeDoCodigo, listarCaixasCadastro, salvarCaixa } from "./acoes-caixa";
import { alternarMes, preencherPorCodigo } from "./caixa";
import type { CaixaDoNivel } from "./dados";
import { EscolhaOrgao } from "./escolha-orgao";
import { EscolhaRua } from "./escolha-rua";
import { Campo, Titulo, botaoBase, caixaCampo, secao, type OpcoesEstrutura } from "./formulario";
import { MESES, ORGAOS, TIPOS_CAIXA, type Orgao, type TipoCaixa } from "./tipos";

// Cadastro de caixa (sem quadro no canvas: segue o estilo do "Cadastro novo" e da Estrutura).
// Geral = arquivo geral, a caixa é o próprio registro. Detalhada = licitações e contratos, cada
// item é cadastrado como documento e a etiqueta da caixa lista todos.
export function FormularioCaixa({
  estrutura,
  regras,
  tipologias,
}: {
  estrutura: OpcoesEstrutura;
  regras: Regra[];
  tipologias: TipologiaDoc[];
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [tipo, setTipo] = useState<TipoCaixa>("geral");
  const [orgao, setOrgao] = useState<Orgao>("prefeitura");
  const [rua, setRua] = useState("");
  const [modulo, setModulo] = useState("");
  const [nivel, setNivel] = useState("");
  const [caixa, setCaixa] = useState("");
  const [caixas, setCaixas] = useState<CaixaDoNivel[]>([]);
  const [codigo, setCodigo] = useState("");
  const [classeId, setClasseId] = useState("");
  const [tipologiaId, setTipologiaId] = useState("");
  const [prazo, setPrazo] = useState("");
  const [permanente, setPermanente] = useState(false);
  const [meses, setMeses] = useState<number[]>([]);
  const [digitalizada, setDigitalizada] = useState(false);
  const [etiquetaGeral, setEtiquetaGeral] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [dicaCodigo, setDicaCodigo] = useState<string | null>(null);

  const modulosDaRua = estrutura.modulos.filter((m) => m.ruaId === rua);
  const niveisDoModulo = estrutura.niveis.filter((n) => n.moduloId === modulo);
  const caixaEscolhida = caixas.find((c) => c.id === caixa);
  const grupoDaClasse = regras.find((r) => r.id === classeId)?.grupoId;
  const tipologiasDoGrupo = tipologias.filter((t) => t.grupoId === grupoDaClasse);
  const classes = regras.filter((r) => r.ativa || r.id === classeId);

  useEffect(() => {
    let vivo = true;
    if (nivel) listarCaixasCadastro(nivel).then((l) => vivo && setCaixas(l));
    return () => {
      vivo = false;
    };
  }, [nivel]);

  // Código digitado: o servidor devolve classe, grupo e prazo da tabela de temporalidade.
  async function buscarCodigo() {
    const c = codigo.trim();
    setDicaCodigo(null);
    if (!c) return;
    const p = preencherPorCodigo(await classeDoCodigo(c));
    if (!p) return setDicaCodigo("Código não encontrado na tabela de temporalidade.");
    setClasseId(p.classeId);
    setTipologiaId("");
    setPrazo(p.prazo);
    setPermanente(p.permanente);
  }

  function escolherClasse(id: string) {
    setClasseId(id);
    setTipologiaId("");
    setDicaCodigo(null);
    const r = regras.find((x) => x.id === id);
    if (!r) return setPrazo("");
    setCodigo(r.codigo);
    setPermanente(r.tipoPrazo === "permanente");
    setPrazo(r.tipoPrazo === "permanente" ? "" : String(r.corrente + r.intermediaria));
  }

  function enviar(dados: FormData) {
    setErro(null);
    setAviso(null);
    dados.set("id", caixa);
    dados.set("orgao", orgao);
    dados.set("tipo", tipo);
    dados.set("meses", meses.join(","));
    dados.set("classe", classeId);
    dados.set("tipologia", tipologiaId);
    dados.set("codigo_classificacao", codigo);
    dados.set("prazo_anos", prazo);
    if (digitalizada) dados.set("digitalizada", "on");
    if (etiquetaGeral) dados.set("etiqueta_geral", "on");
    iniciar(async () => {
      const r = await salvarCaixa(dados);
      if (r.erro) {
        const el = r.campo ? document.querySelector<HTMLElement>(`[name="${r.campo}"]`) : null;
        el?.focus();
        return setErro(r.erro);
      }
      if (!r.id) return setAviso(r.aviso ?? null);
      router.push(`/etiquetas?caixas=${r.id}`);
      router.refresh();
    });
  }

  const geral = tipo === "geral";
  return (
    <form action={enviar} className="grid items-start gap-4 lg:grid-cols-[1fr_400px]" noValidate>
      <div className="flex min-w-0 flex-col gap-3.5">
        <section className={secao} aria-labelledby="c1">
          <div id="c1"><Titulo n={1}>Tipo de caixa</Titulo></div>
          <div className="flex flex-wrap items-end gap-3.5">
            <div role="radiogroup" aria-label="Tipo de caixa" className="inline-flex shrink-0 gap-[3px] rounded-[22px] border border-linha bg-campo p-[3px]">
              {(Object.keys(TIPOS_CAIXA) as TipoCaixa[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={tipo === t}
                  onClick={() => setTipo(t)}
                  className={`min-h-[34px] rounded-[18px] px-[18px] text-[13px] focus-visible:outline-2 focus-visible:outline-foco ${tipo === t ? "bg-aqua font-semibold text-petroleo" : "text-texto-suave"}`}
                >
                  {TIPOS_CAIXA[t]}
                </button>
              ))}
            </div>
            <Campo rotulo="Órgão">{(id) => <EscolhaOrgao id={id} valor={orgao} aoEscolher={setOrgao} />}</Campo>
          </div>
          <p className="text-[13px] text-texto-suave">
            {geral
              ? "Arquivo geral: cadastro bruto (por exemplo, processos de pagamento). A caixa é o próprio registro e não lista o conteúdo."
              : "Licitações e contratos: cada item é cadastrado como documento e a etiqueta da caixa lista todos os itens."}
          </p>
          {!geral && (
            <label className="flex items-center gap-2.5 text-sm">
              <input type="checkbox" checked={etiquetaGeral} onChange={(e) => setEtiquetaGeral(e.target.checked)} className="size-[18px] accent-[#0e7490]" />
              Gerar também etiqueta geral (sem listar itens)
            </label>
          )}
        </section>

        {geral && (
          <section className={secao} aria-labelledby="c2">
            <div id="c2"><Titulo n={2}>Dados da caixa</Titulo></div>
            <div className="grid gap-3.5 sm:grid-cols-2">
              <Campo rotulo="Fundo">{(id) => <input id={id} name="fundo" maxLength={120} className={caixaCampo} />}</Campo>
              <Campo rotulo="Setor">{(id) => <input id={id} name="setor" maxLength={120} className={caixaCampo} />}</Campo>
            </div>
            <div className="grid gap-3.5 sm:grid-cols-[.7fr_1.3fr_1fr]">
              <Campo rotulo="Código de classificação">
                {(id) => (
                  <>
                    <input
                      id={id}
                      value={codigo}
                      maxLength={20}
                      onChange={(e) => setCodigo(e.target.value)}
                      onBlur={() => void buscarCodigo()}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), void buscarCodigo())}
                      className={`${caixaCampo} font-mono`}
                    />
                    {dicaCodigo && <span role="status" className="text-xs text-[#b45309] dark:text-[#fbbf24]">{dicaCodigo}</span>}
                  </>
                )}
              </Campo>
              <Campo rotulo="Classe (tabela de temporalidade)">
                {(id) => (
                  <select id={id} value={classeId} onChange={(e) => escolherClasse(e.target.value)} className={caixaCampo}>
                    <option value="">Escolha…</option>
                    {classes.map((r) => <option key={r.id} value={r.id}>{r.codigo} · {r.classe}</option>)}
                  </select>
                )}
              </Campo>
              <Campo rotulo="Tipologia documental (opcional)">
                {(id) => (
                  <select id={id} value={tipologiaId} onChange={(e) => setTipologiaId(e.target.value)} disabled={!classeId} className={caixaCampo}>
                    <option value="">Sem tipologia</option>
                    {tipologiasDoGrupo.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
                  </select>
                )}
              </Campo>
            </div>
            <div className="grid gap-3.5 sm:grid-cols-3">
              <Campo rotulo="Prazo de guarda (anos)">
                {(id) => <input id={id} readOnly value={permanente ? "Permanente" : prazo} placeholder="Vem da classe" className={`${caixaCampo} font-mono`} />}
              </Campo>
              <Campo rotulo="Ano limite">
                {(id) => <input id={id} name="ano_limite" inputMode="numeric" maxLength={4} placeholder="2023" className={`${caixaCampo} font-mono`} />}
              </Campo>
              <Campo rotulo="Digitalizado">
                {(id) => (
                  <div id={id} role="radiogroup" aria-label="Digitalizado" className="inline-flex w-fit gap-[3px] rounded-[22px] border border-linha bg-campo p-[3px]">
                    {([[false, "Não"], [true, "Sim"]] as const).map(([v, nome]) => (
                      <button
                        key={nome}
                        type="button"
                        role="radio"
                        aria-checked={digitalizada === v}
                        onClick={() => setDigitalizada(v)}
                        className={`min-h-[34px] rounded-[18px] px-[18px] text-[13px] focus-visible:outline-2 focus-visible:outline-foco ${digitalizada === v ? "bg-aqua font-semibold text-petroleo" : "text-texto-suave"}`}
                      >
                        {nome}
                      </button>
                    ))}
                  </div>
                )}
              </Campo>
            </div>
            <div className="flex min-w-0 flex-col gap-[5px]">
              <span id="rotulo-meses" className="text-[11px] font-medium tracking-[.05em] text-texto-suave uppercase">Meses (marque um ou vários)</span>
              <div role="group" aria-labelledby="rotulo-meses" className="grid grid-cols-6 gap-2 sm:grid-cols-12">
                {MESES.map((nome, i) => (
                  <button
                    key={nome}
                    type="button"
                    role="checkbox"
                    aria-checked={meses.includes(i + 1)}
                    aria-label={nome}
                    onClick={() => setMeses((m) => alternarMes(m, i + 1))}
                    className={`min-h-9 rounded-lg border text-[13px] focus-visible:outline-2 focus-visible:outline-foco ${meses.includes(i + 1) ? "border-[#0e7490] bg-aqua font-semibold text-petroleo" : "border-borda-campo bg-campo text-texto-suave"}`}
                  >
                    {nome.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>
            <Campo rotulo="Observações (opcional)">
              {(id) => <textarea id={id} name="observacao" maxLength={500} rows={2} className={`${caixaCampo} py-2`} />}
            </Campo>
          </section>
        )}

        <section className={secao} aria-labelledby="c3">
          <div id="c3"><Titulo n={geral ? 3 : 2}>Onde a caixa está guardada</Titulo></div>
          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            <Campo rotulo="Rua">
              {(id) => <EscolhaRua id={id} ruas={estrutura.ruas} valor={rua} aoEscolher={(v) => { setRua(v); setModulo(""); setNivel(""); setCaixa(""); }} />}
            </Campo>
            <Campo rotulo="Módulo">
              {(id) => (
                <select id={id} value={modulo} disabled={!rua} onChange={(e) => { setModulo(e.target.value); setNivel(""); setCaixa(""); }} className={`${caixaCampo} font-mono`}>
                  <option value="">Escolha…</option>
                  {modulosDaRua.map((m) => <option key={m.id} value={m.id}>Módulo {m.numero}</option>)}
                </select>
              )}
            </Campo>
            <Campo rotulo="Nível">
              {(id) => (
                <select id={id} value={nivel} disabled={!modulo} onChange={(e) => { setNivel(e.target.value); setCaixa(""); }} className={`${caixaCampo} font-mono`}>
                  <option value="">Escolha…</option>
                  {niveisDoModulo.map((n) => <option key={n.id} value={n.id}>Nível {n.numero}</option>)}
                </select>
              )}
            </Campo>
            <Campo rotulo="Caixa">
              {(id) => (
                <select id={id} value={caixa} disabled={!nivel} onChange={(e) => setCaixa(e.target.value)} className={`${caixaCampo} font-mono`}>
                  <option value="">Escolha…</option>
                  {(nivel ? caixas : []).map((c) => (
                    <option key={c.id} value={c.id}>{`Caixa ${String(c.numero).padStart(2, "0")} · ${c.documentos} ${c.documentos === 1 ? "documento" : "documentos"}`}</option>
                  ))}
                </select>
              )}
            </Campo>
          </div>
        </section>
      </div>

      <div className="flex min-w-0 flex-col gap-3.5">
        <div className={secao}>
          <Campo rotulo="Nº da caixa">
            {(id) => (
              <input
                id={id}
                readOnly
                value={caixaEscolhida && caixaEscolhida.orgao === orgao ? String(caixaEscolhida.sequencial).padStart(4, "0") : "Gerado ao salvar"}
                className={`${caixaCampo} font-mono`}
              />
            )}
          </Campo>
          <p className="text-xs text-texto-suave">O sistema numera em sequência, uma sequência para a {ORGAOS.prefeitura} e outra para a {ORGAOS.camara}. O endereço físico (rua, módulo, nível e caixa) é separado deste número.</p>
        </div>
        {erro && <p id="erro-formulario" role="alert" className="text-sm text-erro">{erro}</p>}
        {aviso && <p role="status" className="rounded-lg border border-linha bg-superficie-2 p-3 text-sm">{aviso}</p>}
        <div className="flex gap-2.5">
          <button type="submit" disabled={pendente || !caixa} title={caixa ? undefined : "Escolha a caixa onde ela está guardada"} className={`${botaoBase} flex-1 bg-[linear-gradient(135deg,#0e7490,#0f766e)] text-white hover:opacity-90 dark:bg-none dark:bg-[#2dd4bf] dark:text-[#0b2e3a]`}>
            Salvar caixa
          </button>
        </div>
      </div>
    </form>
  );
}
