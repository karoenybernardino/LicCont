"use client";

// Tela do mapa (quadros "Mapa 3D", "Planta baixa" e os da Fase 4). O servidor
// manda a estrutura e a planta; aqui ficam a vista, a seleção, a ocupação e o
// mover em lote. A seleção também vai para a URL (?caixa=), para o link do QR
// da Fase 5 e para o botão de voltar.
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition, type KeyboardEvent } from "react";
import type { Estrutura } from "@/features/estrutura/ocupacao";
import { buscarNoMapa, lerCaixa, lerOcupacao, moverDocumentos } from "./acoes";
import { indicePorCodigo, montarArvore, primeiraCaixa } from "./arvore";
import { lerCodigo } from "./codigo";
import { CORES } from "./cores";
import type { DetalheCaixa } from "./dados";
import { calcularLeiaute, enderecoDaInstancia, moduloDaInstancia, vizinha } from "./geometria";
import { ListaCaixas } from "./lista-caixas";
import { Corredor } from "./corredor";
import type { ComandosCamera } from "./mapa-3d";
import { MoverDocumentos } from "./mover";
import { faixaMedia, faixaOcupacao } from "./ocupacao";
import { CaixaSelecionada, DentroDaCaixa, estilos } from "./painel-caixa";
import { PlantaSvg } from "./planta";
import { FAIXAS, PADRAO_METROS_CELULA, VISTAS, type CaixaCompacta, type Planta, type Vista } from "./tipos";
import { caminhoDeVolta, urlMapa } from "./url";
import { useMovimentoReduzido, useTema } from "./usar-tema";

const Mapa3D = dynamic(() => import("./mapa-3d"), {
  ssr: false,
  loading: () => <div aria-hidden className="size-full animate-pulse rounded-xl bg-superficie-2" />,
});

const CHAVE_VISTA = "liccont.mapa.vista";
const temWebGL = () => {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
};

type Props = {
  estrutura: Estrutura;
  caixas: CaixaCompacta[];
  planta: Planta;
  galpoes: { id: string; nome: string }[];
  galpaoId: string;
  inicial: { caixa: string | null; doc: string | null; vista: Vista | null; codigos: string[] };
  podeEditar: boolean;
  podeMover: boolean;
  grande: boolean;
};

export function MapaCliente({ estrutura, caixas, planta, galpoes, galpaoId, inicial, podeEditar, podeMover, grande }: Props) {
  const router = useRouter();
  const tema = useTema();
  const reduzir = useMovimentoReduzido();
  const leiaute = useMemo(() => calcularLeiaute(estrutura, caixas, planta), [estrutura, caixas, planta]);
  const arvore = useMemo(() => montarArvore(estrutura, caixas), [estrutura, caixas]);
  const porCodigo = useMemo(() => indicePorCodigo(arvore), [arvore]);
  const paleta = CORES[tema];

  const destaqueIds = useMemo(() => inicial.codigos.map((c) => porCodigo.get(c)).filter((x): x is string => !!x), [inicial.codigos, porCodigo]);
  const [vista, setVista] = useState<Vista>(inicial.vista ?? "3d");
  const [selecionada, setSelecionada] = useState<string | null>(inicial.caixa ?? destaqueIds[0] ?? null);
  const [detalhe, setDetalhe] = useState<DetalheCaixa | null | undefined>(undefined);
  const [webgl, setWebgl] = useState<"ok" | "sem" | "erro">("ok");
  const [pronto, setPronto] = useState(false);
  const [angulo, setAngulo] = useState(0);
  const [listaAberta, setListaAberta] = useState(false);
  const [ocupacao, setOcupacao] = useState<Map<string, { documentos: number; capacidade: number }> | null>(null);
  const [ocupacaoLigada, setOcupacaoLigada] = useState(false);
  const buscandoOcupacao = useRef(false);
  const [busca, setBusca] = useState("");
  const [mensagem, setMensagem] = useState<string | null>(destaqueIds.length ? `Mostrando as caixas dos ${destaqueIds.length} primeiros resultados` : null);
  const [anuncio, setAnuncio] = useState("");
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const [moverAberto, setMoverAberto] = useState(false);
  const [destinoId, setDestinoId] = useState<string | null>(null);
  const [destino, setDestino] = useState<DetalheCaixa | null | undefined>(undefined);
  const [erroMover, setErroMover] = useState<string | null>(null);
  const [movendo, iniciarMover] = useTransition();
  const comandos = useRef<ComandosCamera>(null);
  const painelRef = useRef<HTMLDivElement>(null);

  // Vista lembrada e WebGL: só dá para conferir no navegador.
  useEffect(() => {
    const t = window.setTimeout(() => {
      if (!temWebGL()) {
        setWebgl("sem");
        setVista((v) => (v === "3d" ? "planta" : v));
        return;
      }
      if (inicial.vista) return;
      try {
        const v = localStorage.getItem(CHAVE_VISTA);
        if (v === "3d" || v === "planta" || v === "corredor") setVista(v);
      } catch {
        // Sem armazenamento: abre no 3D.
      }
    }, 0);
    return () => window.clearTimeout(t);
  }, [inicial.vista]);

  const indice = selecionada ? (leiaute.caixas.porId.get(selecionada) ?? null) : null;

  // Seleção na URL (sem recarregar a página).
  useEffect(() => {
    window.history.replaceState(null, "", urlMapa({ galpao: galpaoId, grande, caixa: selecionada, doc: inicial.doc, vista, codigos: inicial.codigos }));
  }, [selecionada, vista, galpaoId, inicial.doc, inicial.codigos, grande]);

  // Documentos da caixa selecionada (lidos com o RLS de quem consulta).
  useEffect(() => {
    if (!selecionada) return;
    let vivo = true;
    lerCaixa({ id: selecionada })
      .then((d) => {
        if (!vivo) return;
        setDetalhe(d);
        if (d) setAnuncio(`Rua ${d.rua}, módulo ${d.modulo}, nível ${d.nivel}, caixa ${d.caixa}. ${d.total === 1 ? "1 documento" : `${d.total} documentos`}.`);
        else setAnuncio("Caixa não encontrada.");
      })
      .catch(() => {
        if (!vivo) return;
        setDetalhe(null);
        setAnuncio("Não foi possível abrir a caixa. Tente de novo.");
      });
    return () => {
      vivo = false;
    };
  }, [selecionada]);

  useEffect(() => {
    if (!destinoId) return;
    let vivo = true;
    lerCaixa({ id: destinoId })
      .then((d) => vivo && setDestino(d))
      .catch(() => vivo && setDestino(null));
    return () => {
      vivo = false;
    };
  }, [destinoId]);

  const escolher = useCallback(
    (id: string, rolar = false) => {
      if (moverAberto) {
        setDestinoId(id);
        setDestino(undefined);
        return;
      }
      setSelecionada(id);
      setDetalhe(undefined);
      setMarcados(new Set());
      setMensagem(null);
      const i = leiaute.caixas.porId.get(id);
      if (i !== undefined) comandos.current?.irAte(i);
      if (rolar || window.matchMedia("(max-width: 1023px)").matches) window.setTimeout(() => painelRef.current?.scrollIntoView({ behavior: reduzir ? "auto" : "smooth", block: "start" }), 50);
    },
    [leiaute, moverAberto, reduzir],
  );

  const escolherVista = (v: Vista) => {
    setVista(v);
    try {
      localStorage.setItem(CHAVE_VISTA, v);
    } catch {
      // ignorado: a escolha vale só nesta tela
    }
  };

  async function ligarOcupacao() {
    if (ocupacaoLigada) return setOcupacaoLigada(false);
    setOcupacaoLigada(true);
    if (!ocupacao && !buscandoOcupacao.current) {
      buscandoOcupacao.current = true;
      try {
        const linhas = await lerOcupacao({ galpao: galpaoId, grande });
        setOcupacao(new Map(linhas.map((l) => [l.caixaId, { documentos: l.documentos, capacidade: l.capacidade }])));
      } catch {
        setOcupacaoLigada(false);
        setMensagem("Não foi possível carregar a ocupação. Tente de novo.");
      } finally {
        buscandoOcupacao.current = false;
      }
    }
  }

  const faixas = useMemo(() => {
    if (!ocupacaoLigada || !ocupacao) return null;
    const f = new Uint8Array(leiaute.caixas.n);
    leiaute.caixas.ids.forEach((id, i) => {
      const o = ocupacao.get(id);
      f[i] = o ? faixaOcupacao(o.documentos, o.capacidade) : 0;
    });
    return f;
  }, [ocupacaoLigada, ocupacao, leiaute]);

  async function irPara(e: React.FormEvent) {
    e.preventDefault();
    const texto = busca.trim();
    if (!texto) return;
    const c = lerCodigo(texto);
    if (c) {
      const id = primeiraCaixa(arvore, c);
      if (id) {
        setMensagem(null);
        return escolher(id, true);
      }
      return setMensagem("Caixa não encontrada.");
    }
    let r: Awaited<ReturnType<typeof buscarNoMapa>>;
    try {
      r = await buscarNoMapa({ q: texto });
    } catch {
      return setMensagem("Não foi possível buscar agora. Tente de novo.");
    }
    const achada = r.map((x) => porCodigo.get(x.codigo)).find((x): x is string => !!x);
    if (achada) {
      setMensagem(null);
      return escolher(achada, true);
    }
    setMensagem("Nenhum documento encontrado para esse número.");
  }

  function aoTeclar(e: KeyboardEvent<HTMLDivElement>) {
    const mapa: Record<string, "esq" | "dir" | "cima" | "baixo" | "modulo+" | "modulo-" | undefined> = {
      ArrowLeft: "esq", ArrowRight: "dir", ArrowUp: "cima", ArrowDown: "baixo", PageDown: "modulo+", PageUp: "modulo-",
    };
    const dir = mapa[e.key];
    if (dir) {
      e.preventDefault();
      const alvo = indice === null ? (leiaute.caixas.n ? 0 : -1) : vizinha(leiaute, indice, dir);
      if (alvo >= 0) escolher(leiaute.caixas.ids[alvo]);
      return;
    }
    if (e.key === "Enter" && selecionada) painelRef.current?.scrollIntoView({ block: "start" });
    else if (e.key === "+" || e.key === "=") comandos.current?.aproximar(1.25);
    else if (e.key === "-") comandos.current?.aproximar(0.8);
    else if (e.key === "[") comandos.current?.girar(-1);
    else if (e.key === "]") comandos.current?.girar(1);
    else if (e.key === "0") comandos.current?.centralizar();
    else return;
    e.preventDefault();
  }

  // Mover em lote.
  const marcaveis = detalhe?.documentos.filter((d) => d.marcavel) ?? [];
  const marcadosLinhas = detalhe?.documentos.filter((d) => marcados.has(d.id)) ?? [];
  function confirmarMover() {
    if (!destinoId || !detalhe) return;
    setErroMover(null);
    iniciarMover(async () => {
      const r = await moverDocumentos({ documentos: [...marcados], destino: destinoId });
      if (r.erro) return setErroMover(r.erro);
      setMoverAberto(false);
      setMarcados(new Set());
      setDestinoId(null);
      setMensagem(r.aviso ?? null);
      setAnuncio(r.aviso ?? "");
      // A ocupação em cache ficou velha: some e volta a ser buscada se estiver ligada.
      setOcupacao(null);
      if (ocupacaoLigada) {
        setOcupacaoLigada(false);
        setMensagem((m) => m ?? "Ocupação atualizada. Ligue de novo para ver as cores novas.");
      }
      lerCaixa({ id: detalhe.id }).then(setDetalhe).catch(() => setDetalhe(null));
    });
  }

  const voltar = caminhoDeVolta(inicial.doc);
  const moduloSel = indice !== null ? moduloDaInstancia(leiaute, indice) : null;
  const endereco = indice !== null ? enderecoDaInstancia(leiaute, indice) : null;
  const ruaSel = endereco ? arvore.find((r) => r.codigo === endereco.rua) : undefined;
  const destaquesIdx = useMemo(() => destaqueIds.map((id) => leiaute.caixas.porId.get(id)).filter((x): x is number => x !== undefined), [destaqueIds, leiaute]);
  const modulosDestacados = useMemo(() => new Set(destaquesIdx.map((i) => moduloDaInstancia(leiaute, i)?.id).filter((x): x is string => !!x)), [destaquesIdx, leiaute]);
  const resumo = `${galpoes.find((g) => g.id === galpaoId)?.nome ?? "Galpão"}: ${leiaute.ruas.length} ruas, ${leiaute.modulos.length} módulos, ${leiaute.caixas.n.toLocaleString("pt-BR")} caixas`;

  const botao = `${estilos.botaoBorda} !min-h-9 !px-3 max-md:!min-h-11`;
  const fundo = { background: `linear-gradient(180deg, ${paleta.fundo[0]}, ${paleta.fundo[1]})` };

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_330px] items-stretch gap-4 max-lg:grid-cols-1 lg:h-full lg:min-h-0">
      <section aria-label="Mapa do galpão" className={`${estilos.cartao} !p-4 lg:min-h-0`}>
        <div className="flex flex-wrap items-center gap-2.5">
          <form onSubmit={irPara} role="search" className="flex min-w-60 flex-1 items-center gap-2">
            <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-[10px] border border-borda-campo bg-campo px-3 focus-within:outline-2 focus-within:outline-foco max-md:h-11">
              <span className="sr-only">Ir para caixa, rua ou documento</span>
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                maxLength={60}
                placeholder="Ir para caixa, rua ou documento"
                className="min-w-0 flex-1 bg-transparent text-sm outline-0"
              />
            </label>
            <button type="submit" className={estilos.botaoCheio}>
              Ir
            </button>
          </form>
          {galpoes.length > 1 && (
            <label className="flex items-center gap-2 text-xs text-texto-suave">
              Galpão
              <select
                value={galpaoId}
                onChange={(e) => router.push(urlMapa({ galpao: e.target.value }))}
                className="h-10 rounded-lg border border-borda-campo bg-campo px-2 text-[13px] text-texto max-md:h-11"
              >
                {galpoes.map((g) => (
                  <option key={g.id} value={g.id}>{g.nome}</option>
                ))}
              </select>
            </label>
          )}
          {voltar && (
            <Link href={voltar} className={estilos.botaoBorda}>
              Voltar ao documento
            </Link>
          )}
          {podeEditar && (
            <Link href={grande ? "/mapa/editar" : `/mapa/editar?galpao=${galpaoId}`} className={estilos.botaoBorda}>
              Editar planta
            </Link>
          )}
        </div>
        {mensagem && (
          <p role={mensagem.startsWith("Não foi possível") ? "alert" : "status"} className={mensagem.startsWith("Não foi possível") ? "text-[13px] text-erro" : "text-[13px] text-texto-suave"}>
            {mensagem}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div role="group" aria-label="Vista do mapa" className="inline-flex gap-[3px] rounded-[13px] border border-linha bg-superficie p-[3px]">
            {(Object.keys(VISTAS) as Vista[]).map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={vista === v}
                onClick={() => escolherVista(v)}
                className={`min-h-[34px] rounded-[10px] px-4 text-[13px] max-md:min-h-11 ${estilos.foco} ${vista === v ? "bg-[rgba(45,212,191,.18)] font-semibold" : "hover:bg-superficie-2"}`}
              >
                {VISTAS[v]}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" aria-pressed={ocupacaoLigada} onClick={ligarOcupacao} className={`${botao} ${ocupacaoLigada ? "!border-[#ff9f1c] bg-[#fff3d1] text-[#0b2e3a]" : ""}`}>
              Mostrar ocupação
            </button>
            <button type="button" aria-expanded={listaAberta} onClick={() => setListaAberta((a) => !a)} className={botao}>
              Ver em lista
            </button>
          </div>
        </div>

        {webgl !== "ok" && (
          <p role="status" className="rounded-lg border border-linha bg-superficie-2 px-3 py-2 text-[13px]">
            O 3D não está disponível neste aparelho. Use a planta ou a lista de caixas.
            {webgl === "erro" && (
              <button type="button" className="ml-2 underline" onClick={() => (setWebgl("ok"), setPronto(false))}>
                Tentar de novo
              </button>
            )}
          </p>
        )}

        {vista === "3d" && webgl === "ok" && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" aria-label="Aproximar" onClick={() => comandos.current?.aproximar(1.25)} className={`${botao} !w-[38px] !px-0 max-md:!w-11`}>+</button>
              <button type="button" aria-label="Afastar" onClick={() => comandos.current?.aproximar(0.8)} className={`${botao} !w-[38px] !px-0 max-md:!w-11`}>−</button>
              <button type="button" onClick={() => comandos.current?.centralizar()} className={botao}>Centralizar</button>
              <button type="button" aria-label="Girar 90° para a esquerda" onClick={() => comandos.current?.girar(-1)} className={botao}>↺</button>
              <button type="button" aria-label="Girar 90° para a direita" onClick={() => comandos.current?.girar(1)} className={botao}>↻</button>
              <span className="ml-1 font-mono text-[13px]">Ângulo {angulo}°</span>
            </div>
            <div
              tabIndex={0}
              role="group"
              aria-label="Mapa 3D do galpão"
              aria-describedby="teclado-3d"
              onKeyDown={aoTeclar}
              data-3d-pronto={pronto ? "sim" : "nao"}
              className={`relative h-[560px] overflow-hidden rounded-[14px] border border-linha max-md:h-[60vh] lg:h-auto lg:min-h-[320px] lg:flex-1 ${estilos.foco}`}
              style={fundo}
            >
              <Mapa3D
                leiaute={leiaute}
                tema={tema}
                selecionada={indice}
                destaques={destaquesIdx}
                faixas={faixas}
                onSelecionar={(i) => escolher(leiaute.caixas.ids[i])}
                onAngulo={setAngulo}
                onPronto={() => setPronto(true)}
                onErro={() => setWebgl("erro")}
                comandos={comandos}
                reduzirMovimento={reduzir}
              />
            </div>
            <p id="teclado-3d" className="text-xs text-texto-suave">
              Teclado: setas mudam de caixa e de nível, Page Up e Page Down mudam de módulo, Enter abre a caixa, + e − aproximam, [ e ] giram 90°, 0 centraliza.
            </p>
          </>
        )}

        {vista === "planta" && (
          <div className="rounded-[14px] border border-linha p-3.5 lg:min-h-0 lg:flex-1 lg:overflow-hidden" style={{ background: `linear-gradient(180deg, ${paleta.planta.fundo[0]}, ${paleta.planta.fundo[1]})` }}>
            <PlantaSvg
              metrosCelula={planta.metrosCelula ?? PADRAO_METROS_CELULA}
              leiaute={leiaute}
              elementos={planta.elementos}
              tema={tema}
              resumo={`Planta baixa do galpão: ${leiaute.ruas.map((r) => `Rua ${r.codigo}`).join(", ")}${endereco ? `, caixa ${endereco.caixa} da rua ${endereco.rua} módulo ${endereco.modulo} em laranja` : ""}`}
              moduloSelecionado={moduloSel?.id ?? null}
              codigoCaixa={endereco ? `C${String(endereco.caixa).padStart(2, "0")}` : null}
              modulosDestacados={modulosDestacados}
              faixaDoModulo={ocupacaoLigada && ocupacao ? (m) => (m.primeira < 0 ? null : faixaMedia(Array.from({ length: m.caixas }, (_, k) => ocupacao.get(leiaute.caixas.ids[m.primeira + k]) ?? { documentos: 0, capacidade: 1 }))) : undefined}
              onModulo={(m) => m.primeira >= 0 && escolher(leiaute.caixas.ids[m.primeira])}
            />
          </div>
        )}

        {vista === "corredor" && (
          <div className="rounded-[14px] border border-linha p-3.5 lg:min-h-0 lg:flex-1 lg:overflow-hidden" style={fundo}>
            <Corredor rua={ruaSel} tema={tema} selecionada={selecionada} onSelecionar={(id) => escolher(id)} />
          </div>
        )}

        {vista === "3d" && webgl === "ok" && (
          <p className="text-[13px]">
            <span className="text-[11px] font-semibold tracking-[.05em] text-texto-suave uppercase">Dica </span>
            Arraste para andar · botão direito ou dois dedos para girar · roda do mouse para zoom
          </p>
        )}

        <ul aria-label="Legenda" className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs">
          {ocupacaoLigada ? (
            <>
              <li className="font-semibold">Ocupação da caixa</li>
              {FAIXAS.map((f) => (
                <li key={f.faixa} className="flex items-center gap-1.5">
                  <span aria-hidden className="size-3.5 rounded" style={{ background: paleta.ocupacao[f.faixa] }} />
                  {f.rotulo}
                </li>
              ))}
            </>
          ) : (
            <>
              <li className="flex items-center gap-1.5"><span aria-hidden className="size-3.5 rounded" style={{ background: paleta.selecionada.frente }} />Caixa selecionada</li>
              <li className="flex items-center gap-1.5"><span aria-hidden className="size-3.5 rounded" style={{ background: paleta.caixa.frente }} />Caixa-arquivo guardada</li>
              <li className="flex items-center gap-1.5"><span aria-hidden className="size-3.5 rounded" style={{ background: paleta.estante.frente }} />Estante de aço</li>
              <li className="flex items-center gap-1.5"><span aria-hidden className="size-3.5 rounded" style={{ background: paleta.faixaSeguranca }} />Faixa de segurança</li>
            </>
          )}
        </ul>
        <div aria-live="polite" className="sr-only">
          {anuncio}
        </div>
        <p className="sr-only">{resumo}</p>
      </section>

      <aside ref={painelRef} className="sc flex min-w-0 flex-col gap-4 scroll-mt-4 lg:min-h-0 lg:overflow-y-auto">
        {selecionada && detalhe === null ? (
          <section aria-label="Caixa selecionada" className={estilos.cartao}>
            <p role="status" className="text-sm">Caixa não encontrada.</p>
          </section>
        ) : (
          <>
            <CaixaSelecionada d={detalhe ?? null} carregando={!!selecionada && detalhe === undefined} />
            <DentroDaCaixa
              d={detalhe ?? null}
              marcaveis={podeMover && marcaveis.length > 0}
              marcados={marcados}
              onMarcar={(id) => setMarcados((s) => (s.has(id) ? new Set([...s].filter((x) => x !== id)) : new Set(s).add(id)))}
              onMarcarTodos={() => setMarcados((s) => (s.size === marcaveis.length ? new Set() : new Set(marcaveis.map((d) => d.id))))}
              onMover={() => {
                setMoverAberto(true);
                setDestinoId(null);
                setDestino(undefined);
                setErroMover(null);
              }}
              moverAberto={moverAberto}
            />
          </>
        )}
        {moverAberto && detalhe && (
          <MoverDocumentos
            arvore={arvore}
            origem={detalhe}
            marcados={marcadosLinhas}
            destinoId={destinoId}
            destino={destino}
            onDestino={(id) => (setDestinoId(id), setDestino(undefined))}
            onCancelar={() => setMoverAberto(false)}
            onConfirmar={confirmarMover}
            pendente={movendo}
            erro={erroMover}
          />
        )}
        {listaAberta && <ListaCaixas arvore={arvore} selecionada={selecionada} onSelecionar={(id) => escolher(id, true)} />}
      </aside>
    </div>
  );
}
