"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { botaoContorno, botaoPrimario } from "@/ui/canvas";
import { Painel, Rotulo, TituloPainel } from "@/features/estrutura/componentes";
import { CampoRotulado, campo } from "@/features/movimento/ui";
import { processarPlanilha, type RetornoImportacao } from "./acoes";
import { CAMPOS, type Mapa } from "./colunas";

const PASSOS = ["Enviar arquivos", "Casar colunas", "Conferir", "Resultado"];

// Modelo de planilha para baixar (dados fictícios, só os títulos e uma linha de exemplo).
const MODELO =
  "﻿Tipo;Número;Ano;Objeto;Secretaria;Situação;Modalidade;Empresa;CNPJ;Valor;Início da vigência;Fim da vigência\r\n" +
  "Licitação;001/2024;2024;Exemplo de objeto;Saúde;Concluída;Pregão Eletrônico;;;;;\r\n";

function baixar(nome: string, texto: string, tipo = "text/csv;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([texto], { type: tipo }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  a.click();
  URL.revokeObjectURL(url);
}

export function Assistente({ secretarias, semEndereco }: { secretarias: { id: string; nome: string }[]; semEndereco: number }) {
  const [passo, setPasso] = useState(1);
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [destino, setDestino] = useState("");
  const [lido, setLido] = useState<RetornoImportacao | null>(null);
  const [mapa, setMapa] = useState<Mapa>({});
  const [conf, setConf] = useState<NonNullable<RetornoImportacao["conferencia"]> | null>(null);
  const [lote, setLote] = useState<RetornoImportacao["lote"] | null>(null);
  const entrada = useRef<HTMLInputElement>(null);

  function montar(etapa: string) {
    const f = new FormData();
    f.set("etapa", etapa);
    f.set("arquivo", arquivo!);
    f.set("destino", destino);
    f.set("mapa", JSON.stringify(mapa));
    return f;
  }
  function chamar(etapa: string, aoConcluir: (r: RetornoImportacao) => void) {
    setErro(null);
    setAviso(null);
    iniciar(async () => {
      const r = await processarPlanilha(montar(etapa));
      if (r.erro) setErro(r.faltando?.length ? `${r.erro} Falta: ${r.faltando.join(", ")}.` : r.erro);
      else aoConcluir(r);
    });
  }

  const obrigatoriosOk = CAMPOS.filter((c) => c.obrigatorio && mapa[c.chave] === undefined && !(c.chave === "secretaria" && destino)).length === 0;

  return (
    <div className="flex flex-col gap-4">
      <ol className="flex flex-wrap items-center gap-3 text-[13px]" aria-label="Passos da importação">
        {PASSOS.map((p, i) => (
          <li key={p} aria-current={passo === i + 1 ? "step" : undefined} className={`flex items-center gap-2 ${passo === i + 1 ? "font-semibold text-texto" : "text-texto-suave"}`}>
            <span className={`flex size-6 items-center justify-center rounded-full border text-xs ${passo >= i + 1 ? "border-destaque bg-destaque/15" : "border-linha"}`}>{i + 1}</span>
            {p}
          </li>
        ))}
      </ol>

      {erro && (
        <p role="alert" className="rounded-lg border border-[#dc2626] px-3 py-2 text-sm text-[#b91c1c] dark:text-[#f87171]">
          {erro}
        </p>
      )}
      {aviso && (
        <p role="status" className="rounded-lg border border-linha px-3 py-2 text-sm">
          {aviso}
        </p>
      )}

      {passo === 1 && (
        <Painel>
          <TituloPainel>Enviar a planilha dos documentos</TituloPainel>
          <p className="text-sm text-texto-suave">
            Exporte a lista dos documentos do GED em planilha. Aceita Excel (.xlsx) e CSV; planilhas com macro (.xlsm) não são aceitas. Até 5.000 linhas e 10 MB por envio. Os PDFs
            seguem pelo envio de PDFs de cada documento.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            <CampoRotulado rotulo="Secretaria de destino (se a planilha não tiver a coluna)">
              <select className={campo} value={destino} onChange={(e) => setDestino(e.target.value)}>
                <option value="">Usar a coluna Secretaria da planilha</option>
                {secretarias.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nome}
                  </option>
                ))}
              </select>
            </CampoRotulado>
            <CampoRotulado rotulo="Planilha dos documentos">
              <input ref={entrada} type="file" accept=".xlsx,.csv" className={campo} onChange={(e) => setArquivo(e.target.files?.[0] ?? null)} />
            </CampoRotulado>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" className={botaoContorno} onClick={() => baixar("modelo-importacao.csv", MODELO)}>
              Baixar modelo de planilha
            </button>
            <button
              type="button"
              disabled={!arquivo || pendente}
              className={`${botaoPrimario} disabled:opacity-55`}
              onClick={() =>
                chamar("ler", (r) => {
                  setLido(r);
                  setMapa(r.sugestao ?? {});
                  setPasso(2);
                })
              }
            >
              {pendente ? "Lendo…" : "Continuar: casar colunas"}
            </button>
          </div>
        </Painel>
      )}

      {passo === 2 && lido?.cabecalhos && (
        <Painel>
          <TituloPainel>Casar as colunas da planilha</TituloPainel>
          <p className="text-sm text-texto-suave">O sistema sugeriu os campos pelo nome das colunas. Campos com * são obrigatórios.</p>
          <div className="sc overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="text-left">
                  <th className="px-2 py-2 text-[11px] font-semibold uppercase">Campo no LicCONT</th>
                  <th className="px-2 py-2 text-[11px] font-semibold uppercase">Coluna da planilha</th>
                  <th className="px-2 py-2 text-[11px] font-semibold uppercase">Exemplo da 1ª linha</th>
                </tr>
              </thead>
              <tbody>
                {CAMPOS.map((c) => {
                  const i = mapa[c.chave];
                  return (
                    <tr key={c.chave} className="border-t border-linha">
                      <td className="px-2 py-2">
                        <label htmlFor={`col-${c.chave}`}>
                          {c.rotulo}
                          {c.obrigatorio && !(c.chave === "secretaria" && destino) ? " *" : ""}
                        </label>
                      </td>
                      <td className="px-2 py-2">
                        <select
                          id={`col-${c.chave}`}
                          className={campo}
                          value={i ?? ""}
                          onChange={(e) => {
                            const { [c.chave]: _fora, ...resto } = mapa;
                            void _fora;
                            setMapa(e.target.value === "" ? resto : { ...resto, [c.chave]: Number(e.target.value) });
                          }}
                        >
                          <option value="">Não importar</option>
                          {lido.cabecalhos!.map((t, k) => {
                            const emUso = Object.entries(mapa).some(([ch, v]) => v === k && ch !== c.chave);
                            return (
                              <option key={k} value={k} disabled={emUso}>
                                {t || `Coluna ${k + 1}`}
                              </option>
                            );
                          })}
                        </select>
                      </td>
                      <td className="px-2 py-2 text-texto-suave">{i === undefined ? "—" : (lido.amostra?.[0]?.[i] ?? "")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" className={botaoContorno} onClick={() => setPasso(1)}>
              Voltar
            </button>
            <button
              type="button"
              disabled={!obrigatoriosOk || pendente}
              className={`${botaoPrimario} disabled:opacity-55`}
              onClick={() =>
                chamar("conferir", (r) => {
                  setConf(r.conferencia ?? null);
                  setPasso(3);
                })
              }
            >
              {pendente ? "Conferindo…" : "Continuar: conferir"}
            </button>
          </div>
        </Painel>
      )}

      {passo === 3 && conf && (
        <Painel>
          <TituloPainel>Conferir antes de importar</TituloPainel>
          <dl className="grid gap-3 sm:grid-cols-4">
            {[
              ["Linhas lidas", conf.total, "na planilha"],
              ["Prontas para importar", conf.prontas, "sem problema"],
              ["Com problema", conf.comProblema, "não serão importadas"],
              ["Repetidas · pular", conf.repetidas, "já existem ou repetem no arquivo"],
            ].map(([r, v, l]) => (
              <div key={String(r)} className="rounded-xl border border-linha px-4 py-3">
                <dt>
                  <Rotulo>{r}</Rotulo>
                </dt>
                <dd className="text-2xl font-bold">{Number(v).toLocaleString("pt-BR")}</dd>
                <dd className="text-xs text-texto-suave">{l}</dd>
              </div>
            ))}
          </dl>
          {conf.erros.length > 0 && (
            <>
              <p className="text-sm text-texto-suave">
                Mostrando {conf.erros.length} problemas. Baixe a lista completa para corrigir na planilha.
              </p>
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="text-left">
                    <th className="px-2 py-1 text-[11px] uppercase">Linha</th>
                    <th className="px-2 py-1 text-[11px] uppercase">Campo</th>
                    <th className="px-2 py-1 text-[11px] uppercase">Problema</th>
                  </tr>
                </thead>
                <tbody>
                  {conf.erros.map((e, i) => (
                    <tr key={i} className="border-t border-linha">
                      <td className="px-2 py-1.5">{e.linha}</td>
                      <td className="px-2 py-1.5">{e.campo}</td>
                      <td className="px-2 py-1.5">{e.motivo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button type="button" className={botaoContorno} onClick={() => baixar("erros-importacao.csv", conf.errosCsv)}>
                Baixar relatório de erros (CSV)
              </button>
            </>
          )}
          <p className="text-sm text-texto-suave">
            Repetidas são puladas: o sistema não aceita dois documentos ativos com o mesmo processo, e nada é sobrescrito.
          </p>
          <div className="flex flex-wrap gap-3">
            <button type="button" className={botaoContorno} onClick={() => setPasso(2)}>
              Voltar
            </button>
            <button
              type="button"
              disabled={conf.prontas === 0 || pendente}
              className={`${botaoPrimario} disabled:opacity-55`}
              onClick={() =>
                chamar("gravar", (r) => {
                  if (r.aviso && !r.lote) setAviso(r.aviso);
                  setLote(r.lote ?? { gravados: conf.prontas, pulados: conf.repetidas, comProblema: conf.comProblema, semEndereco: 0 });
                  setPasso(4);
                })
              }
            >
              {pendente ? "Importando…" : `Importar ${conf.prontas.toLocaleString("pt-BR")} documentos`}
            </button>
          </div>
        </Painel>
      )}

      {passo === 4 && lote && (
        <Painel>
          <TituloPainel>{lote.gravados.toLocaleString("pt-BR")} documentos importados</TituloPainel>
          <p className="text-sm text-texto-suave">
            {lote.pulados} repetidas puladas · {lote.comProblema} linhas com problema não foram importadas.
          </p>
          <p className="rounded-lg border border-linha px-3 py-2 text-sm">
            <strong>{(lote.semEndereco || semEndereco).toLocaleString("pt-BR")} documentos estão sem endereço.</strong> Eles já aparecem na pesquisa, mas o mapa só mostra onde o papel está depois de
            localizar a caixa.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/cadastro/localizar" className={botaoPrimario}>
              Localizar documentos no galpão
            </Link>
            <button
              type="button"
              className={botaoContorno}
              onClick={() => {
                setPasso(1);
                setArquivo(null);
                setLido(null);
                setConf(null);
                setLote(null);
                setMapa({});
                if (entrada.current) entrada.current.value = "";
              }}
            >
              Importar outro lote
            </button>
          </div>
        </Painel>
      )}
    </div>
  );
}
