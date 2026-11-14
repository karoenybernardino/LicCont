import Link from "next/link";
import { Pilula } from "@/ui/canvas";
import { Rotulo } from "@/features/estrutura/componentes";
import type { Usuario } from "@/features/sessao/dal";
import { linkDaMiniatura } from "./acoes";
import { BotaoBaixar, BotoesGestao } from "./botoes";
import { podeConferir, secretariasParaCadastro, type DocumentoDetalhe } from "./dados";
import { descreverArquivo, formatarData, formatarValor } from "./formato";
import { MODALIDADES, SITUACOES, TIPOS } from "./tipos";
import { tituloDocumento } from "./titulo";

const classeBotao =
  "inline-flex min-h-10 items-center justify-center rounded-lg border border-linha px-4 text-[13px] font-medium hover:border-destaque focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco";

export const tomSituacao = (s: string) =>
  ["em_andamento", "deserta", "fracassada", "revogada", "anulada", "rescindido"].includes(s) ? ("aviso" as const) : ("ok" as const);

function Dado({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="min-w-0">
      <Rotulo>{rotulo}</Rotulo>
      <p className="text-sm font-medium break-words">{valor}</p>
    </div>
  );
}

const AVISOS: Record<string, string> = {
  resolucao_baixa: "A resolução parece menor que 300 dpi.",
  sem_pdfa: "O arquivo não é PDF/A.",
};

// Painel do documento: à direita da pesquisa e na tela inteira de /documentos/[id].
export async function PainelDocumento({ doc, usuario, inteiro = false }: { doc: DocumentoDetalhe; usuario: Usuario; inteiro?: boolean }) {
  const [cadastra, gere, miniatura] = await Promise.all([
    secretariasParaCadastro(usuario).then((l) => l.some((s) => s.id === doc.secretariaId)),
    podeConferir(usuario, doc.secretariaId),
    doc.arquivo?.situacao === "pronto" && doc.arquivo.miniatura ? linkDaMiniatura(doc.id) : Promise.resolve(null),
  ]);
  const a = doc.arquivo;
  const titulo = tituloDocumento(doc);
  return (
    <article aria-label="Documento" className="flex min-w-0 flex-col gap-4 rounded-[14px] border border-linha bg-superficie p-5">
      <header className="flex flex-col gap-1">
        <p className="text-xs text-texto-suave">
          {TIPOS[doc.tipo]}
          {doc.modalidade ? ` · ${MODALIDADES[doc.modalidade]}` : ""}
        </p>
        <div className="flex flex-wrap items-center gap-2.5">
          {inteiro ? null : <h2 className="font-titulo text-[19px] leading-6 font-bold">{titulo}</h2>}
          {doc.conferido && <Pilula tom="ok">Conferido</Pilula>}
          {!doc.ativo && <Pilula tom="erro">Desativado</Pilula>}
        </div>
        <p className="text-sm text-texto-suave">{doc.objeto}</p>
      </header>

      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        <Dado rotulo="Empresa" valor={doc.empresa ?? "—"} />
        <Dado rotulo="Secretaria" valor={doc.secretaria || "—"} />
        <Dado rotulo="Ano" valor={String(doc.ano)} />
        <Dado rotulo="Valor" valor={formatarValor(doc.valor)} />
        <Dado rotulo="Situação" valor={SITUACOES[doc.situacao] ?? doc.situacao} />
        {doc.tipo === "contrato" && <Dado rotulo="Vigência" valor={`${formatarData(doc.vigencia_inicio)} a ${formatarData(doc.vigencia_fim)}`} />}
      </div>

      <div className="flex flex-col gap-1 rounded-[10px] border border-linha bg-superficie-2 px-3.5 py-2.5">
        <Rotulo>Onde está guardado</Rotulo>
        <p className="font-mono text-sm font-medium">{doc.posicao?.texto ?? "—"}</p>
        {doc.posicao && <p className="font-mono text-xs text-texto-suave">{doc.posicao.codigo}</p>}
      </div>

      <div className="flex flex-col gap-2.5">
        <Rotulo>Arquivo digital</Rotulo>
        {a ? (
          <div className="flex items-center gap-3">
            {miniatura ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={miniatura} alt="Primeira página do PDF" width={64} height={88} className="h-[88px] w-16 shrink-0 rounded border border-linha object-cover" />
            ) : (
              <span aria-hidden className="flex h-[88px] w-16 shrink-0 items-center justify-center rounded border border-linha bg-superficie-2 text-xs font-semibold text-texto-suave">PDF</span>
            )}
            <div className="min-w-0">
              <p className="font-mono text-[13px] break-all">{a.nome}</p>
              <p className="text-xs text-texto-suave">{descreverArquivo("", a.paginas, a.tamanho).replace(/^ · /, "")}</p>
              {a.situacao === "enviando" && <p className="text-xs text-texto-suave">Envio incompleto.{cadastra ? " Abra “Editar” para enviar de novo." : ""}</p>}
              {a.situacao === "conferindo" && <p role="status" className="text-xs text-texto-suave">Conferindo…</p>}
              {a.situacao === "recusado" && <p className="text-xs text-erro">O envio foi recusado. Envie de novo.</p>}
              {a.situacao === "pronto" && a.avisos.length > 0 && (
                <p className="text-xs text-[#b45309] dark:text-[#fbbf24]">{a.avisos.map((x) => AVISOS[x]).join(" ")} A digitalização pode não ter valor legal.</p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-texto-suave">Sem PDF anexado.</p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {a?.situacao === "pronto" && (
          <>
            <Link href={`/documentos/${doc.id}/pdf`} className={`${classeBotao} bg-[linear-gradient(135deg,#0e7490,#0f766e)] !border-0 text-white dark:bg-none dark:bg-[#2dd4bf] dark:text-[#0b2e3a]`}>
              Abrir PDF
            </Link>
            <BotaoBaixar documentoId={doc.id} />
          </>
        )}
        {cadastra && doc.ativo && (
          <Link href={`/documentos/${doc.id}/editar`} className={classeBotao}>
            Editar
          </Link>
        )}
        {gere && <BotoesGestao documentoId={doc.id} conferido={doc.conferido} ativo={doc.ativo} />}
        {doc.caixaId && (
          <Link href={`/mapa?caixa=${doc.caixaId}&doc=${doc.id}`} className={classeBotao}>
            Ir para o mapa 3D
          </Link>
        )}
        {!inteiro && (
          <Link href={`/documentos/${doc.id}`} className={classeBotao}>
            Abrir em tela inteira
          </Link>
        )}
      </div>
    </article>
  );
}
