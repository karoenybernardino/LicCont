import Link from "next/link";
import type { ReactNode } from "react";
import { Pilula } from "@/ui/canvas";
import type { Usuario } from "@/features/sessao/dal";
import { linkDaMiniatura } from "./acoes";
import { BotaoBaixar, BotoesGestao } from "./botoes";
import {
  podeConferir,
  secretariasParaCadastro,
  type DocumentoDetalhe,
  type Posicao,
} from "./dados";
import { descreverArquivo, formatarData, formatarValor } from "./formato";
import { MODALIDADES, SITUACOES, TIPOS } from "./tipos";
import { tituloDocumento } from "./titulo";

export const tomSituacao = (s: string) =>
  [
    "em_andamento",
    "deserta",
    "fracassada",
    "revogada",
    "anulada",
    "rescindido",
  ].includes(s)
    ? ("aviso" as const)
    : ("ok" as const);

const ROT =
  "text-[11px] font-medium tracking-[.05em] text-texto-suave uppercase";
const cartao =
  "flex min-w-0 flex-col gap-3.5 rounded-2xl border border-linha bg-superficie px-5 py-[18px] dark:border-[#1b3a44] dark:bg-[linear-gradient(160deg,#0d1d23_0%,#060b0d_55%)]";
const botaoCanvas =
  "inline-flex min-h-[38px] items-center justify-center rounded-lg border border-linha bg-transparent px-3.5 text-[13px] font-medium whitespace-nowrap hover:border-[#2dd4bf] hover:shadow-[0_0_0_1px_#2dd4bf] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco dark:border-[#1b3a44]";

function Dado({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-[3px]">
      <span className={ROT}>{rotulo}</span>
      <span className="text-sm break-words">{valor}</span>
    </div>
  );
}

const AVISOS: Record<string, string> = {
  resolucao_baixa: "A resolução parece menor que 300 dpi.",
  sem_pdfa: "O arquivo não é PDF/A.",
};

// Estante do quadro: 4 caixas por nível, 4 níveis; a caixa do documento fica turquesa.
function Estante({ p }: { p: Posicao }) {
  const lin = [0, 1, 2, 3];
  return (
    <svg
      viewBox="0 0 524 378"
      width="100%"
      role="img"
      aria-label={`Estante da Rua ${p.rua}, módulo ${p.modulo}: caixa ${p.caixa} do nível ${p.nivel} destacada`}
      className="block"
    >
      <g transform="translate(0 30) matrix(1 -0.12 0 1 0 14)">
        <rect
          x="0"
          y="0"
          width="454"
          height="348"
          rx="8"
          strokeWidth="2"
          className="fill-[#dbe9ec] stroke-[#9bbcc4] dark:fill-[#060b0d] dark:stroke-[#2b5563]"
        />
        {lin.map((r) => (
          <g key={r}>
            {lin.map((c) => {
              const x = 18 + c * 106;
              const y = 18 + r * 80;
              const alvo = r === p.nivel - 1 && c === p.caixa - 1;
              return (
                <g key={c}>
                  <rect
                    x={x}
                    y={y}
                    width="96"
                    height="56"
                    rx="4"
                    className={
                      alvo
                        ? "fill-[#2dd4bf]"
                        : "fill-[#0b2e3a]/85 dark:fill-[#4f8592]/85"
                    }
                  />
                  {alvo && (
                    <text
                      x={x + 48}
                      y={y + 33}
                      textAnchor="middle"
                      fontFamily="JetBrains Mono,monospace"
                      fontWeight="500"
                      fontSize="14"
                      fill="#0b2e3a"
                    >
                      C{String(p.caixa).padStart(2, "0")}
                    </text>
                  )}
                </g>
              );
            })}
            <rect
              x="8"
              y={81 + r * 80}
              width="446"
              height="4"
              rx="2"
              className="fill-[#9bbcc4] dark:fill-[#2b5563]"
            />
          </g>
        ))}
      </g>
      <path
        d="M454 44 l60 -22 v348 l-60 22z"
        fillOpacity=".55"
        className="fill-[#9bbcc4] dark:fill-[#2b5563]"
      />
    </svg>
  );
}

// Mapa do galpão do quadro: ruas A–D por módulos 1–5; o módulo do documento fica turquesa.
function MiniMapa({ p }: { p: Posicao }) {
  return (
    <svg
      viewBox="0 0 190 106"
      width="240"
      role="img"
      aria-label={`Mapa do galpão: Rua ${p.rua}, módulo ${p.modulo}`}
      className="block"
    >
      {["A", "B", "C", "D"].map((rua, r) => (
        <g key={rua}>
          <text
            x="0"
            y={17 + r * 26}
            fontFamily="JetBrains Mono,monospace"
            fontSize="11"
            fontWeight="500"
            className="fill-[#3f5e66] dark:fill-[#9bb8bf]"
          >
            {rua}
          </text>
          {[1, 2, 3, 4, 5].map((m) => (
            <rect
              key={m}
              x={18 + (m - 1) * 34}
              y={3 + r * 26}
              width="28"
              height="20"
              rx="3"
              className={
                rua === p.rua && m === p.modulo
                  ? "fill-[#2dd4bf] stroke-[#0b2e3a]/12"
                  : "fill-white/60 stroke-[#0b2e3a]/12 dark:fill-[#0a1418] dark:stroke-[#1b3a44]"
              }
            />
          ))}
        </g>
      ))}
    </svg>
  );
}

// A etiqueta de verdade é de fase futura: aqui vai só o desenho do quadro (não é um QR legível).
function QrExemplo({ semente }: { semente: string }) {
  let h = 0;
  for (const ch of semente) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const dentro = (x: number, y: number) =>
    (x < 8 && y < 8) || (x > 12 && y < 8) || (x < 8 && y > 12);
  const celulas: ReactNode[] = [];
  for (let y = 0; y < 21; y++)
    for (let x = 0; x < 21; x++) {
      h = (h * 1664525 + 1013904223) >>> 0;
      if (!dentro(x, y) && h >>> 28 > 7)
        celulas.push(
          <rect
            key={`${x}-${y}`}
            x={x}
            y={y}
            width="1"
            height="1"
            fill="#0b2e3a"
          />,
        );
    }
  const olho = (x: number, y: number) => (
    <g key={`${x}${y}`}>
      <rect x={x} y={y} width="7" height="7" fill="#0b2e3a" />
      <rect x={x + 1} y={y + 1} width="5" height="5" fill="#fff" />
      <rect x={x + 2} y={y + 2} width="3" height="3" fill="#0b2e3a" />
    </g>
  );
  return (
    <svg
      viewBox="-1 -1 23 23"
      width="88"
      height="88"
      role="img"
      aria-label="Desenho de exemplo do QR da etiqueta"
      className="block shrink-0 rounded-lg bg-white"
    >
      {celulas}
      {olho(0, 0)}
      {olho(14, 0)}
      {olho(0, 14)}
    </svg>
  );
}

// Painel do documento, como nos quadros "Pesquisa com painel do documento":
// cabeçalho com dados, onde está guardado, etiqueta, mapa do galpão e arquivo.
export async function PainelDocumento({
  doc,
  usuario,
  inteiro = false,
}: {
  doc: DocumentoDetalhe;
  usuario: Usuario;
  inteiro?: boolean;
}) {
  const [cadastra, gere, miniatura] = await Promise.all([
    secretariasParaCadastro(usuario).then((l) =>
      l.some((s) => s.id === doc.secretariaId),
    ),
    podeConferir(usuario, doc.secretariaId),
    doc.arquivo?.situacao === "pronto" && doc.arquivo.miniatura
      ? linkDaMiniatura(doc.id)
      : Promise.resolve(null),
  ]);
  const a = doc.arquivo;
  const titulo = tituloDocumento(doc);
  const pos = doc.posicao;
  return (
    <article aria-label="Documento" className="flex min-w-0 flex-col gap-4">
      <div className={cartao}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className={ROT}>
              {TIPOS[doc.tipo]}
              {doc.modalidade ? ` · ${MODALIDADES[doc.modalidade]}` : ""}
            </p>
            {inteiro ? null : (
              <h2 className="mt-1 font-titulo text-2xl leading-tight font-bold">
                {titulo}
              </h2>
            )}
            <p className="mt-1 text-sm text-texto-suave">{doc.objeto}</p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            {doc.conferido && <Pilula tom="ok">Conferido</Pilula>}
            {!doc.ativo && <Pilula tom="erro">Desativado</Pilula>}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Dado rotulo="Empresa" valor={doc.empresa ?? "—"} />
          <Dado rotulo="Secretaria" valor={doc.secretaria || "—"} />
          <Dado rotulo="Ano" valor={String(doc.ano)} />
          <Dado rotulo="Valor" valor={formatarValor(doc.valor)} />
          <Dado
            rotulo="Situação"
            valor={SITUACOES[doc.situacao] ?? doc.situacao}
          />
          {doc.tipo === "contrato" && (
            <Dado
              rotulo="Vigência"
              valor={`${formatarData(doc.vigencia_inicio)} a ${formatarData(doc.vigencia_fim)}`}
            />
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.25fr_1fr]">
        <div className={`${cartao} flex-1`}>
          <span className={ROT}>Onde está guardado</span>
          <p className="font-mono text-lg leading-6 font-medium">
            {pos?.texto ?? "—"}
          </p>
          {pos && (
            <div className="flex flex-1 items-center justify-center">
              <div className="w-full max-w-[400px]">
                <Estante p={pos} />
              </div>
            </div>
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          <div className={cartao}>
            <span className={ROT}>Etiqueta da caixa</span>
            <div className="flex items-center gap-3.5">
              <QrExemplo semente={pos?.codigo ?? doc.id} />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <p className="text-[13px] leading-[19px] text-texto-suave">
                  {pos
                    ? `QR da caixa ${String(pos.caixa).padStart(2, "0")}. Abre este documento no celular.`
                    : "Sem caixa definida."}
                </p>
                {doc.caixaId ? (
                  <Link href={`/etiquetas?caixas=${doc.caixaId}`} className={`${botaoCanvas} w-full`}>
                    Imprimir etiqueta
                  </Link>
                ) : (
                  <button type="button" disabled title="Sem caixa definida" className={`${botaoCanvas} w-full cursor-not-allowed opacity-50`}>
                    Imprimir etiqueta
                  </button>
                )}
              </div>
            </div>
          </div>
          {pos && (
            <div className={`${cartao} flex-1`}>
              <span className={ROT}>Mapa do galpão</span>
              <div className="flex justify-center">
                <MiniMapa p={pos} />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className={cartao}>
        {a ? (
          <div className="flex items-center gap-3 rounded-xl border border-linha bg-superficie-2 px-3.5 py-2.5 dark:border-[#1b3a44] dark:bg-[#0a1418]">
            {miniatura ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={miniatura}
                alt="Primeira página do PDF"
                width={40}
                height={56}
                className="h-14 w-10 shrink-0 rounded border border-linha object-cover"
              />
            ) : (
              <svg
                width="28"
                height="28"
                viewBox="0 0 64 64"
                aria-hidden
                className="shrink-0"
              >
                <path
                  d="M6 17a4 4 0 0 1 4-4h14l6 7h24a4 4 0 0 1 4 4v26a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4z"
                  fill="#0e7490"
                />
                <path
                  d="M21 36l7.5 7.5L44 28"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[13px] font-medium break-all">
                {a.nome}
              </p>
              <p className="text-xs text-texto-suave">
                {descreverArquivo("", a.paginas, a.tamanho).replace(/^ · /, "")}
              </p>
              {a.situacao === "enviando" && (
                <p className="text-xs text-texto-suave">
                  Envio incompleto.
                  {cadastra ? " Abra “Editar” para enviar de novo." : ""}
                </p>
              )}
              {a.situacao === "conferindo" && (
                <p role="status" className="text-xs text-texto-suave">
                  Conferindo…
                </p>
              )}
              {a.situacao === "recusado" && (
                <p className="text-xs text-erro">
                  O envio foi recusado. Envie de novo.
                </p>
              )}
              {a.situacao === "pronto" && a.avisos.length > 0 && (
                <p className="text-xs text-[#b45309] dark:text-[#fbbf24]">
                  {a.avisos.map((x) => AVISOS[x]).join(" ")} A digitalização
                  pode não ter valor legal.
                </p>
              )}
            </div>
            {a.situacao === "pronto" && (
              <Link
                href={`/documentos/${doc.id}/pdf`}
                className={`${botaoCanvas} min-h-9`}
              >
                Abrir PDF
              </Link>
            )}
          </div>
        ) : (
          <p className="text-sm text-texto-suave">Sem PDF anexado.</p>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          {a?.situacao === "pronto" && <BotaoBaixar documentoId={doc.id} />}
          {cadastra && doc.ativo && (
            <Link href={`/documentos/${doc.id}/editar`} className={botaoCanvas}>
              Editar
            </Link>
          )}
          {gere && (
            <BotoesGestao
              documentoId={doc.id}
              conferido={doc.conferido}
              ativo={doc.ativo}
            />
          )}
          {!inteiro && (
            <Link href={`/documentos/${doc.id}`} className={botaoCanvas}>
              Abrir em tela inteira
            </Link>
          )}
        </div>
      </div>

      <div className="flex flex-wrap justify-end gap-3">
        {doc.caixaId && (
          <Link
            href={`/mapa?caixa=${doc.caixaId}&doc=${doc.id}`}
            className={`${botaoCanvas} min-h-11 px-5 text-sm`}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
              aria-hidden
              className="mr-2"
            >
              <path d="M12 2l9 5v10l-9 5-9-5V7z" />
              <path d="M12 12l9-5M12 12L3 7M12 12v10" />
            </svg>
            Ir para o mapa 3D
          </Link>
        )}
        <button
          type="button"
          disabled
          title="Registrar empréstimo · em breve"
          className="min-h-11 cursor-not-allowed rounded-lg bg-[linear-gradient(135deg,#0e7490,#0f766e)] px-5 text-sm font-semibold text-white opacity-50 dark:bg-none dark:bg-[#2dd4bf] dark:text-[#0b2e3a]"
        >
          Registrar empréstimo
        </button>
      </div>
    </article>
  );
}
