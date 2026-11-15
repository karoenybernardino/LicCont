"use client";

// O 3D do galpão (three.js + react-three-fiber). Só carrega em /mapa e só no
// navegador. Nada busca arquivo fora do site: cores e geometrias saem do
// código, rótulos são HTML. Caixas, prateleiras e montantes são uma malha
// instanciada cada, então o desenho custa poucas chamadas mesmo com 15 mil
// caixas.
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { CameraControls } from "@react-three/drei";
import CameraControlsImpl from "camera-controls";
import { useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, type RefObject, type Ref } from "react";
import { BoxGeometry, Color, EdgesGeometry, Float32BufferAttribute, InstancedMesh, Matrix4, Quaternion, Vector3, type OrthographicCamera } from "three";
import { ALTURA_NIVEL, CELULA, centroDaCaixa, enderecoDaInstancia, type Instancias, type Leiaute } from "./geometria";
import { CORES, type Tema, type Trio } from "./cores";

export type ComandosCamera = {
  irAte(instancia: number): void;
  girar(direcao: 1 | -1): void;
  aproximar(fator: number): void;
  centralizar(): void;
};

type Props = {
  leiaute: Leiaute;
  tema: Tema;
  selecionada: number | null;
  destaques: number[];
  /** Faixa de ocupação por instância; null = cores normais. */
  faixas: Uint8Array | null;
  /** Modo de mover: o clique escolhe o destino, não a caixa a abrir. */
  onSelecionar(instancia: number): void;
  onAngulo(graus: number): void;
  onPronto(): void;
  onErro(): void;
  comandos: Ref<ComandosCamera>;
  reduzirMovimento: boolean;
};

const { ACTION } = CameraControlsImpl;
const AZIMUTE = Math.PI / 4;
const POLAR = Math.acos(1 / Math.sqrt(3)); // ângulo isométrico do canvas

// Caixa de três tons: a cor da instância é a do topo e a cor de cada vértice
// diz quanto cada face escurece. A conta é feita em espaço linear, que é o
// espaço em que o three.js multiplica as cores.
function geometriaDe(trio: Trio) {
  const g = new BoxGeometry(1, 1, 1);
  const topo = new Color(trio.topo);
  const razao = (face: string, extra = 1) => {
    const c = new Color(face);
    return [(c.r / topo.r) * extra, (c.g / topo.g) * extra, (c.b / topo.b) * extra];
  };
  // Ordem do BoxGeometry: +x, -x, +y, -y, +z, -z (4 vértices cada).
  const faces = [razao(trio.lado), razao(trio.lado, 0.85), [1, 1, 1], [0.5, 0.5, 0.5], razao(trio.frente), razao(trio.frente, 0.85)];
  const cores: number[] = [];
  for (const f of faces) for (let v = 0; v < 4; v++) cores.push(f[0], f[1], f[2]);
  g.setAttribute("color", new Float32BufferAttribute(cores, 3));
  return g;
}

function Malha({ inst, trio, cor, onClique }: { inst: Instancias; trio: Trio; cor?: (i: number) => Color; onClique?: (e: ThreeEvent<MouseEvent>) => void }) {
  const ref = useRef<InstancedMesh>(null);
  const geometria = useMemo(() => geometriaDe(trio), [trio]);
  const invalidate = useThree((s) => s.invalidate);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const matriz = new Matrix4();
    const q = new Quaternion();
    const p = new Vector3();
    const s = new Vector3();
    for (let i = 0; i < inst.n; i++) {
      p.set(inst.centro[i * 3], inst.centro[i * 3 + 1], inst.centro[i * 3 + 2]);
      s.set(inst.tamanho[i * 3], inst.tamanho[i * 3 + 1], inst.tamanho[i * 3 + 2]);
      matriz.compose(p, q, s);
      m.setMatrixAt(i, matriz);
    }
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
    invalidate();
  }, [inst, geometria, invalidate]);
  // A geometria antiga some da GPU quando o tema troca.
  useEffect(() => () => geometria.dispose(), [geometria]);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const base = new Color(trio.topo);
    for (let i = 0; i < inst.n; i++) m.setColorAt(i, cor ? cor(i) : base);
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    invalidate();
  }, [inst, trio, cor, invalidate]);
  if (inst.n === 0) return null;
  return (
    <instancedMesh ref={ref} args={[geometria, undefined, inst.n]} frustumCulled={false} onClick={onClique}>
      <meshBasicMaterial vertexColors />
    </instancedMesh>
  );
}

function Camera({
  leiaute,
  comandos,
  reduzir,
  selecionada,
  onAngulo,
  onPronto,
}: Pick<Props, "leiaute" | "selecionada" | "onAngulo" | "onPronto"> & { comandos: Ref<ComandosCamera>; reduzir: boolean }) {
  const controles = useRef<CameraControls>(null);
  const camera = useThree((s) => s.camera) as OrthographicCamera;
  const ultimo = useRef<number | null>(null);
  const limites = useMemo(() => {
    const largura = leiaute.largura * CELULA;
    const fundo = leiaute.profundidade * CELULA;
    let altura = ALTURA_NIVEL;
    for (let i = 0; i < leiaute.prateleiras.n; i++) altura = Math.max(altura, leiaute.prateleiras.centro[i * 3 + 1] + ALTURA_NIVEL);
    return { largura, fundo, altura };
  }, [leiaute]);
  const zoomGeral = useRef(20);

  const tamanho = useThree((s) => s.size);
  // Zoom que enquadra o galpão inteiro na vista isométrica.
  const zoomDoGalpao = () => {
    const alcance = (limites.largura + limites.fundo) * Math.SQRT1_2;
    const altura = alcance * Math.cos(POLAR) + limites.altura * Math.sin(POLAR);
    return Math.max(4, 0.9 * Math.min(tamanho.width / alcance, tamanho.height / altura));
  };

  const centralizar = (animar: boolean) => {
    const c = controles.current;
    if (!c) return;
    const d = 200;
    const h = d * Math.cos(POLAR);
    const r = d * Math.sin(POLAR);
    zoomGeral.current = zoomDoGalpao();
    void c.setLookAt(r * Math.sin(AZIMUTE), h, r * Math.cos(AZIMUTE), 0, limites.altura / 2, 0, animar);
    void c.zoomTo(zoomGeral.current, animar);
  };

  useImperativeHandle(
    comandos,
    () => ({
      irAte(i) {
        const c = controles.current;
        if (!c) return;
        const [x, y, z] = centroDaCaixa(leiaute, i);
        const ox = x - limites.largura / 2;
        const oz = z - limites.fundo / 2;
        const animar = !reduzir;
        void c.moveTo(ox, y, oz, animar);
        void c.zoomTo(Math.min(c.maxZoom, Math.max(camera.zoom, zoomGeral.current * 3)), animar);
      },
      girar(direcao) {
        void controles.current?.rotate(direcao * (Math.PI / 2), 0, !reduzir);
      },
      aproximar(fator) {
        const c = controles.current;
        if (c) void c.zoomTo(Math.min(c.maxZoom, Math.max(c.minZoom, camera.zoom * fator)), !reduzir);
      },
      centralizar() {
        centralizar(!reduzir);
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [leiaute, reduzir, limites, tamanho],
  );

  // O CameraControls só existe depois da montagem: o primeiro enquadramento
  // acontece quando a referência chega, e de novo se o leiaute mudar.
  const iniciada = useRef<typeof limites | null>(null);
  const aoMontar = (c: CameraControls | null) => {
    controles.current = c;
    if (!c || iniciada.current === limites) return;
    iniciada.current = limites;
    centralizar(false);
    onPronto();
  };

  // Ao abrir já com uma caixa selecionada, a câmera vai até ela.
  const aberta = useRef(false);
  const selecionadaInicial = useRef(selecionada);
  useEffect(() => {
    if (aberta.current) return;
    // Só a seleção que veio com a página enquadra sem animar; cliques depois usam irAte.
    if (selecionadaInicial.current === null) {
      aberta.current = true;
      return;
    }
    const alvo = selecionadaInicial.current;
    const t = window.setTimeout(() => {
      aberta.current = true;
      const c = controles.current;
      if (!c) return;
      const [x, y, z] = centroDaCaixa(leiaute, alvo);
      void c.moveTo(x - limites.largura / 2, y, z - limites.fundo / 2, false);
      void c.zoomTo(Math.min(c.maxZoom, zoomGeral.current * 3), false);
    }, 60);
    return () => window.clearTimeout(t);
  }, [leiaute, limites]);

  return (
    <CameraControls
      ref={aoMontar}
      makeDefault
      minPolarAngle={0.35}
      maxPolarAngle={1.35}
      minZoom={4}
      maxZoom={160}
      smoothTime={reduzir ? 0.001 : 0.18}
      draggingSmoothTime={reduzir ? 0.001 : 0.08}
      mouseButtons={{ left: ACTION.TRUCK, middle: ACTION.TRUCK, right: ACTION.ROTATE, wheel: ACTION.ZOOM }}
      touches={{ one: ACTION.TOUCH_TRUCK, two: ACTION.TOUCH_ZOOM_ROTATE, three: ACTION.TOUCH_TRUCK }}
      onUpdate={() => {
        const c = controles.current;
        if (!c) return;
        const graus = Math.round((((c.azimuthAngle - AZIMUTE) * 180) / Math.PI + 360 * 4) % 360);
        if (graus !== ultimo.current) {
          ultimo.current = graus;
          onAngulo(graus);
        }
      }}
    />
  );
}

// Rótulos em HTML por cima do 3D: a cena só calcula onde cada âncora cai na
// tela e escreve a posição direto no elemento (sem criar outra raiz do React).
function Projetar({ camada }: { camada: RefObject<HTMLDivElement | null> }) {
  const v = useMemo(() => new Vector3(), []);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => invalidate());
  useFrame(({ camera, size }) => {
    const el = camada?.current;
    if (!el) return;
    for (const filho of Array.from(el.children) as HTMLElement[]) {
      v.set(Number(filho.dataset.x), Number(filho.dataset.y), Number(filho.dataset.z)).project(camera);
      filho.style.transform = `translate(${((v.x * 0.5 + 0.5) * size.width).toFixed(1)}px, ${((-v.y * 0.5 + 0.5) * size.height).toFixed(1)}px) translate(-50%, -50%)`;
    }
  });
  return null;
}

function Cena({ leiaute, tema, selecionada, destaques, faixas, onSelecionar, onAngulo, onPronto, comandos, reduzirMovimento, camada }: Props & { camada: RefObject<HTMLDivElement | null> }) {
  const paleta = CORES[tema];
  const deslocamento: [number, number, number] = [-(leiaute.largura * CELULA) / 2, 0, -(leiaute.profundidade * CELULA) / 2];
  const conjuntoDestaque = useMemo(() => new Set(destaques), [destaques]);

  const corCaixa = useMemo(() => {
    const normal = new Color(paleta.caixa.topo);
    const destaque = new Color(paleta.selecionada.topo);
    const faixa = paleta.ocupacao.map((c) => new Color(c));
    return (i: number) => (faixas ? faixa[faixas[i]] : conjuntoDestaque.has(i) ? destaque : normal);
  }, [paleta, faixas, conjuntoDestaque]);

  const selecionadaGeo = useMemo(() => geometriaDe(paleta.selecionada), [paleta]);
  const contorno = useMemo(() => new EdgesGeometry(new BoxGeometry(1, 1, 1)), []);

  const clique = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 5 || e.instanceId === undefined) return; // arrastar não é clicar
    e.stopPropagation();
    onSelecionar(e.instanceId);
  };

  const piso: [number, number] = [leiaute.largura * CELULA, leiaute.profundidade * CELULA];
  const sel = selecionada === null ? null : centroDaCaixa(leiaute, selecionada);
  const tamanhoSel = selecionada === null ? null : [leiaute.caixas.tamanho[selecionada * 3], leiaute.caixas.tamanho[selecionada * 3 + 1], leiaute.caixas.tamanho[selecionada * 3 + 2]];
  const endereco = selecionada === null ? null : enderecoDaInstancia(leiaute, selecionada);

  return (
    <>
      <Projetar camada={camada} />
      <Camera leiaute={leiaute} comandos={comandos} reduzir={reduzirMovimento} selecionada={selecionada} onAngulo={onAngulo} onPronto={onPronto} />
      <group position={deslocamento}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[piso[0] / 2, -0.02, piso[1] / 2]}>
          <planeGeometry args={piso} />
          <meshBasicMaterial color={paleta.piso} />
        </mesh>
        {leiaute.ruas.map((r) => (
          <mesh key={r.id} rotation={[-Math.PI / 2, 0, 0]} position={[(r.x + r.w / 2) * CELULA, -0.01, (r.y + r.h / 2) * CELULA]}>
            <planeGeometry args={[r.w * CELULA + 0.5, r.h * CELULA + 0.5]} />
            <meshBasicMaterial color={paleta.sombra} transparent opacity={0.1} depthWrite={false} />
          </mesh>
        ))}
        <Malha inst={leiaute.faixas} trio={{ topo: paleta.faixaSeguranca, frente: paleta.faixaSeguranca, lado: paleta.faixaSeguranca }} />
        <Malha inst={leiaute.montantes} trio={paleta.estante} />
        <Malha inst={leiaute.prateleiras} trio={paleta.estante} />
        <Malha inst={leiaute.caixas} trio={paleta.caixa} cor={corCaixa} onClique={clique} />
        {sel && tamanhoSel && endereco && (
          <group position={sel}>
            <mesh geometry={selecionadaGeo} renderOrder={10} scale={[tamanhoSel[0] * 1.06, tamanhoSel[1] * 1.06, tamanhoSel[2] * 1.06]}>
              <meshBasicMaterial vertexColors depthTest={false} />
            </mesh>
            <mesh renderOrder={9} scale={[tamanhoSel[0] * 1.5, tamanhoSel[1] * 1.5, tamanhoSel[2] * 1.5]}>
              <boxGeometry />
              <meshBasicMaterial color={paleta.selecionada.brilho} transparent opacity={0.28} depthWrite={false} depthTest={false} />
            </mesh>
            <lineSegments geometry={contorno} renderOrder={11} scale={[tamanhoSel[0] * 1.08, tamanhoSel[1] * 1.08, tamanhoSel[2] * 1.08]}>
              <lineBasicMaterial color={paleta.selecionada.contorno} depthTest={false} />
            </lineSegments>
          </group>
        )}
      </group>
    </>
  );
}

export default function Mapa3D(props: Props) {
  const { onErro, leiaute, selecionada } = props;
  const camada = useRef<HTMLDivElement>(null);
  // Desmontar o Canvas também "perde" o contexto do WebGL: isso não é erro.
  const montado = useRef(false);
  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);
  const deslocX = -(leiaute.largura * CELULA) / 2;
  const deslocZ = -(leiaute.profundidade * CELULA) / 2;
  return (
    <div className="relative size-full">
      <Canvas
        orthographic
        frameloop="demand"
        dpr={[1, 2]}
        camera={{ position: [60, 60, 60], zoom: 20, near: -500, far: 1500 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener("webglcontextlost", (e) => {
            e.preventDefault();
            if (montado.current) onErro();
          });
        }}
        style={{ touchAction: "none" }}
        role="img"
        aria-label="Desenho 3D do galpão. Use a lista de caixas ou o teclado para navegar."
      >
        <Cena {...props} camada={camada} />
      </Canvas>
      <div ref={camada} aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        {leiaute.ruas.map((r) => (
          <span
            key={r.id}
            data-x={deslocX + (r.x + (r.w > r.h ? 0 : r.w / 2)) * CELULA}
            data-y={0.1}
            data-z={deslocZ + (r.y + (r.w > r.h ? r.h / 2 : 0)) * CELULA}
            className="absolute top-0 left-0 rounded-lg bg-petroleo px-2 py-0.5 font-mono text-[13px] font-medium text-white select-none"
          >
            {r.codigo}
          </span>
        ))}
      </div>
    </div>
  );
}
