"use client";

import { useRef, useState } from "react";
import { conferirEnvio, iniciarEnvio, salvarTextoPdf } from "./acoes";
import { MOTIVOS } from "./conferencia";
import { sugerirDocumento, type DocumentoSemPdf } from "./lote";
import { lerTextoDoPdf } from "./ocr-navegador";
import { analisarPdf, enviarParaStorage } from "./pdf-navegador";

type Linha = { chave: number; arquivo: File; documento: string; estado: "espera" | "enviando" | "ok" | "erro"; msg: string };

const campo = "min-h-10 w-full rounded-lg border border-linha bg-campo px-3 text-sm text-texto outline-0 focus-visible:outline-2 focus-visible:outline-foco disabled:opacity-60";
const botao = "inline-flex min-h-10 items-center justify-center rounded-lg border border-linha px-5 text-sm font-medium text-texto hover:shadow-[inset_0_0_0_1.5px_#0e7490] focus-visible:outline-2 focus-visible:outline-foco disabled:opacity-55";

// Vários PDFs de uma vez: cada arquivo vai para um documento que ainda não tem PDF.
// O casamento é sugerido pelo número e ano do nome do arquivo e conferido pela pessoa;
// o envio usa o mesmo caminho do cadastro (link assinado + conferência no servidor).
export function LoteEnvio({ documentos }: { documentos: DocumentoSemPdf[] }) {
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [ocupado, setOcupado] = useState(false);
  const [ocr, setOcr] = useState(false);
  const proxima = useRef(0);

  function escolher(arquivos: FileList | null) {
    if (!arquivos) return;
    const usados = new Set(linhas.map((l) => l.documento).filter(Boolean));
    const novas: Linha[] = [];
    for (const arquivo of Array.from(arquivos).slice(0, 50 - linhas.length)) {
      const documento = sugerirDocumento(arquivo.name, documentos, usados) ?? "";
      if (documento) usados.add(documento);
      novas.push({ chave: proxima.current++, arquivo, documento, estado: "espera", msg: documento ? "" : "Escolha o documento." });
    }
    setLinhas((atual) => [...atual, ...novas]);
  }
  const mudar = (chave: number, parte: Partial<Linha>) => setLinhas((atual) => atual.map((l) => (l.chave === chave ? { ...l, ...parte } : l)));

  async function enviarUm(l: Linha) {
    mudar(l.chave, { estado: "enviando", msg: "Preparando o PDF…" });
    const a = await analisarPdf(l.arquivo);
    if ("falha" in a) return mudar(l.chave, { estado: "erro", msg: MOTIVOS[a.falha] });
    const envio = await iniciarEnvio({ documento: l.documento, nome: l.arquivo.name, tamanho: l.arquivo.size, miniatura: !!a.miniatura });
    if ("erro" in envio) return mudar(l.chave, { estado: "erro", msg: envio.erro });
    mudar(l.chave, { msg: "Enviando…" });
    if (!(await enviarParaStorage(envio.urlPdf, l.arquivo))) return mudar(l.chave, { estado: "erro", msg: "O envio falhou. Tente de novo." });
    if (a.miniatura && envio.urlMiniatura) await enviarParaStorage(envio.urlMiniatura, a.miniatura);
    mudar(l.chave, { msg: "Conferindo…" });
    const c = await conferirEnvio({ arquivo: envio.arquivoId, paginas: a.paginas, avisos: a.avisos, miniatura: !!a.miniatura && !!envio.urlMiniatura });
    if (!c.ok) return mudar(l.chave, { estado: "erro", msg: c.erro });
    if (!ocr) return mudar(l.chave, { estado: "ok", msg: "Enviado." });
    // Leitura do texto (OCR) no próprio navegador; se falhar, o PDF já está enviado.
    try {
      const { texto, paginas } = await lerTextoDoPdf(l.arquivo, (p, t) => mudar(l.chave, { msg: `Lendo o texto (página ${p} de ${t})…` }));
      const r = texto ? await salvarTextoPdf({ arquivo: envio.arquivoId, texto, paginas }) : { ok: false, erro: "Nenhum texto encontrado." };
      mudar(l.chave, { estado: "ok", msg: r.ok ? "Enviado e lido." : `Enviado. ${r.erro}` });
    } catch {
      mudar(l.chave, { estado: "ok", msg: "Enviado. Não foi possível ler o texto." });
    }
  }

  async function enviarTodos() {
    setOcupado(true);
    // Um de cada vez: poupa a internet da prefeitura e deixa o erro de cada arquivo claro.
    for (const l of linhas) if (l.estado !== "ok" && l.documento) await enviarUm(l);
    setOcupado(false);
  }

  const escolhidos = linhas.map((l) => l.documento).filter(Boolean);
  const repetido = new Set(escolhidos.filter((d, i) => escolhidos.indexOf(d) !== i));
  const pronto = linhas.length > 0 && linhas.every((l) => l.estado === "ok" || (l.documento && !repetido.has(l.documento)));

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">Escolha os PDFs (até 50)</span>
        <input
          type="file"
          accept="application/pdf"
          multiple
          disabled={ocupado}
          onChange={(e) => {
            escolher(e.target.files);
            e.target.value = "";
          }}
          className={campo}
        />
      </label>
      <label className="flex items-start gap-2.5 text-sm">
        <input type="checkbox" checked={ocr} disabled={ocupado} onChange={(e) => setOcr(e.target.checked)} className="mt-1" />
        <span>
          Ler o texto dos PDFs para a pesquisa achar palavras dentro deles
          <span className="block text-xs text-texto-suave">Roda no seu computador e demora (cerca de alguns segundos por página, até 40 páginas por PDF). O PDF não sai da sua máquina; só o texto é guardado.</span>
        </span>
      </label>
      {documentos.length === 0 && <p className="text-sm text-texto-suave">Todos os documentos ativos já têm PDF.</p>}
      {linhas.length > 0 && (
        <ul className="flex flex-col gap-2.5">
          {linhas.map((l) => (
            <li key={l.chave} className="grid items-center gap-2.5 rounded-lg border border-linha p-3 md:grid-cols-[1fr_1fr_160px]">
              <span className="min-w-0 truncate font-mono text-xs" title={l.arquivo.name}>
                {l.arquivo.name}
              </span>
              <select
                aria-label={`Documento de ${l.arquivo.name}`}
                value={l.documento}
                disabled={ocupado || l.estado === "ok"}
                onChange={(e) => mudar(l.chave, { documento: e.target.value, msg: "" })}
                className={campo}
              >
                <option value="">Escolha o documento</option>
                {documentos.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.titulo}
                  </option>
                ))}
              </select>
              <span role={l.estado === "erro" ? "alert" : "status"} className="text-xs text-texto-suave">
                {l.documento && repetido.has(l.documento) ? "Documento repetido em outra linha." : l.msg}
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2.5">
        <button type="button" disabled={ocupado || !pronto} onClick={enviarTodos} className={botao}>
          {ocupado ? "Enviando…" : "Enviar todos"}
        </button>
        {linhas.length > 0 && (
          <button type="button" disabled={ocupado} onClick={() => setLinhas([])} className={botao}>
            Limpar
          </button>
        )}
      </div>
    </div>
  );
}
