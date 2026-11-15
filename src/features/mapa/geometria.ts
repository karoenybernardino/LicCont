// Leiaute do galpão: posição de cada rua, módulo, estante e caixa no mundo 3D
// e na planta baixa. Puro (sem React, sem three, sem banco): o servidor usa a
// mesma validação para recusar planta inválida e os testes medem o tempo com
// o galpão grande.
import type { Estrutura } from "@/features/estrutura/ocupacao";
import { PADRAO_METROS_CELULA, type CaixaCompacta, type ElementoPlanta, type Giro, type LadoEntrada, type Lados, type Planta } from "./tipos";

export const CELULA = 2; // unidades do mundo 3D por célula de módulo
export const ALTURA_NIVEL = 1; // distância entre prateleiras
const MARGEM = 0.08; // folga dentro do módulo, em células
const LARGURA_ENTRADA = 3; // células

export type Retangulo = { x: number; y: number; w: number; h: number };

export type EstadoRua = "posicionada" | "automatica";
export type ProblemaRua = "fora" | "sobreposta" | null;

export type RuaLeiaute = Retangulo & {
  id: string;
  codigo: string;
  modulos: number;
  giro: Giro;
  lados: Lados;
  estado: EstadoRua;
  problema: ProblemaRua;
  sobrepoeCom: string | null;
};

// "primeira" é a instância da primeira caixa do módulo (-1 se não houver caixa).
export type ModuloLeiaute = Retangulo & { id: string; ruaId: string; numero: number; niveis: number; caixas: number; primeira: number };

// Matrizes planas (uma entrada por instância) para as malhas instanciadas.
export type Instancias = { n: number; centro: Float32Array; tamanho: Float32Array };

export type Leiaute = {
  /** Células de módulo (a planta salva é em metros: ver paraCelulas). */
  largura: number;
  profundidade: number;
  /** Metros por célula usados na conversão. */
  metros: number;
  /** Elementos da planta, já em células. */
  elementos: ElementoPlanta[];
  entrada: { lado: LadoEntrada; posicao: number; largura: number };
  ruas: RuaLeiaute[];
  modulos: ModuloLeiaute[];
  /** Módulo pela chave "idDaRua:número". */
  porModulo: Map<string, ModuloLeiaute>;
  caixas: Instancias & {
    ids: string[];
    // por instância: índice da rua, número do módulo, do nível e da caixa
    meta: Int32Array;
    porId: Map<string, number>;
  };
  prateleiras: Instancias;
  montantes: Instancias;
  faixas: Instancias;
};

// Ponto local da rua (u ao longo, v através) -> célula da planta.
function projetar(giro: Giro, n: number, d: number, x0: number, y0: number, u: number, v: number): [number, number] {
  switch (giro) {
    case 90:
      return [x0 + d - v, y0 + u];
    case 180:
      return [x0 + n - u, y0 + d - v];
    case 270:
      return [x0 + v, y0 + n - u];
    default:
      return [x0 + u, y0 + v];
  }
}

export function tamanhoRua(modulos: number, giro: Giro, lados: Lados = 2): { w: number; h: number } {
  const lado = giro === 90 || giro === 270;
  return { w: lado ? lados : modulos, h: lado ? modulos : lados };
}

// Folga para a soma de decimais (7,2 = 6 + 1,2) não virar "passa da parede".
const EPS = 1e-6;
const cruza = (a: Retangulo, b: Retangulo) => a.x < b.x + b.w - EPS && b.x < a.x + a.w - EPS && a.y < b.y + b.h - EPS && b.y < a.y + a.h - EPS;

// Posições e tamanho do galpão na mesma unidade; `metros` (padrão 1) é o quanto
// uma célula de módulo mede nela (o tamanho da rua é módulos x metros).
export type EntradaValidacao = {
  largura: number;
  profundidade: number;
  metros?: number;
  ruas: { id: string; codigo: string; modulos: number; x: number | null; y: number | null; giro: Giro; lados?: Lados }[];
};
export type Problema = { ruaId: string; tipo: "fora" | "sobreposta"; com: string | null };

// A mesma conferência no editor, no mapa e na Server Action.
export function validarPlanta(e: EntradaValidacao): Problema[] {
  const k = e.metros ?? 1;
  const retas = e.ruas
    .filter((r) => r.x !== null && r.y !== null)
    .map((r) => {
      const t = tamanhoRua(r.modulos, r.giro, r.lados);
      return { r, ret: { x: r.x as number, y: r.y as number, w: t.w * k, h: t.h * k } };
    });
  const problemas: Problema[] = [];
  for (const { r, ret } of retas) {
    if (ret.x < 0 || ret.y < 0 || ret.x + ret.w > e.largura + EPS || ret.y + ret.h > e.profundidade + EPS) {
      problemas.push({ ruaId: r.id, tipo: "fora", com: null });
      continue;
    }
    const outra = retas.find((o) => o.r.id !== r.id && cruza(ret, o.ret));
    if (outra) problemas.push({ ruaId: r.id, tipo: "sobreposta", com: outra.r.codigo });
  }
  return problemas;
}

function vazias(n: number): Instancias {
  return { n, centro: new Float32Array(n * 3), tamanho: new Float32Array(n * 3) };
}

/** Planta em metros -> mesma planta em células de módulo (metros ÷ metrosCelula). */
export function paraCelulas(p: Planta): Planta & { metrosCelula: number } {
  const m = p.metrosCelula ?? PADRAO_METROS_CELULA;
  const c = (v: number) => Math.round((v / m) * 1e4) / 1e4;
  const n = (v: number | null) => (v === null ? null : c(v));
  return {
    ...p,
    metrosCelula: m,
    largura: n(p.largura),
    profundidade: n(p.profundidade),
    entradaPosicao: n(p.entradaPosicao),
    ruas: Object.fromEntries(Object.entries(p.ruas).map(([id, r]) => [id, { ...r, x: n(r.x), y: n(r.y) }])),
    elementos: p.elementos.map((e) => ({ ...e, x: c(e.x), y: c(e.y), largura: c(e.largura), profundidade: c(e.profundidade) })),
  };
}

/** A planta salva está em metros; o leiaute (e o 3D) trabalha em células de módulo. */
export function calcularLeiaute(estrutura: Estrutura, caixas: CaixaCompacta[], plantaMetros: Planta): Leiaute {
  const planta = paraCelulas(plantaMetros);
  const ruasAtivas = estrutura.ruas.filter((r) => r.ativo).sort((a, b) => a.codigo.localeCompare(b.codigo));
  const modulosPorRua = new Map<string, typeof estrutura.modulos>();
  for (const m of estrutura.modulos) {
    if (!m.ativo) continue;
    (modulosPorRua.get(m.ruaId) ?? modulosPorRua.set(m.ruaId, []).get(m.ruaId)!).push(m);
  }
  const niveisPorModulo = new Map<string, typeof estrutura.niveis>();
  for (const n of estrutura.niveis) {
    if (!n.ativo) continue;
    (niveisPorModulo.get(n.moduloId) ?? niveisPorModulo.set(n.moduloId, []).get(n.moduloId)!).push(n);
  }
  const caixasPorNivel = new Map<string, CaixaCompacta[]>();
  for (const c of caixas) (caixasPorNivel.get(c.nivelId) ?? caixasPorNivel.set(c.nivelId, []).get(c.nivelId)!).push(c);

  // 1) Posição de cada rua: a salva, ou o desenho automático (abaixo das salvas).
  type Base = { id: string; codigo: string; mods: typeof estrutura.modulos; giro: Giro; lados: Lados; x: number | null; y: number | null };
  const bases: Base[] = ruasAtivas.map((r) => {
    const mods = (modulosPorRua.get(r.id) ?? []).sort((a, b) => a.numero - b.numero);
    const p = planta.ruas[r.id];
    const salva = p && p.x !== null && p.y !== null;
    return { id: r.id, codigo: r.codigo, mods, giro: salva ? p.giro : 0, lados: p?.lados === 1 ? 1 : 2, x: salva ? p.x : null, y: salva ? p.y : null };
  });
  let baixo = 0;
  for (const b of bases) {
    if (b.x !== null && b.y !== null) baixo = Math.max(baixo, b.y + tamanhoRua(b.mods.length, b.giro, b.lados).h);
  }
  let proximaLinha = baixo + 1;
  for (const b of bases) {
    if (b.x === null) {
      b.x = 1;
      b.y = proximaLinha;
      proximaLinha += 3;
    }
  }

  // 2) Tamanho do galpão: o salvo, ou o que cabe o conteúdo (mais a faixa da entrada).
  let direita = 0;
  let fundo = 0;
  for (const b of bases) {
    const { w, h } = tamanhoRua(b.mods.length, b.giro, b.lados);
    direita = Math.max(direita, (b.x as number) + w);
    fundo = Math.max(fundo, (b.y as number) + h);
  }
  const largura = planta.largura ?? Math.max(4, direita + 1);
  const profundidade = planta.profundidade ?? Math.max(4, fundo + 2);

  const valid = validarPlanta({
    largura,
    profundidade,
    ruas: bases.map((b) => ({ id: b.id, codigo: b.codigo, modulos: b.mods.length, x: b.x, y: b.y, giro: b.giro, lados: b.lados })),
  });
  const ruas: RuaLeiaute[] = bases.map((b) => {
    const t = tamanhoRua(b.mods.length, b.giro, b.lados);
    const p = valid.find((v) => v.ruaId === b.id);
    return {
      id: b.id,
      codigo: b.codigo,
      modulos: b.mods.length,
      giro: b.giro,
      lados: b.lados,
      x: b.x as number,
      y: b.y as number,
      ...t,
      estado: planta.ruas[b.id]?.x != null && planta.ruas[b.id]?.y != null ? "posicionada" : "automatica",
      problema: p?.tipo ?? null,
      sobrepoeCom: p?.com ?? null,
    };
  });

  // 3) Contagens para dimensionar as matrizes.
  let nCaixas = 0;
  let nPrat = 0;
  let nMont = 0;
  for (const b of bases) {
    nMont += b.mods.length * 4;
    for (const m of b.mods) {
      const ns = niveisPorModulo.get(m.id) ?? [];
      nPrat += ns.length;
      for (const n of ns) nCaixas += caixasPorNivel.get(n.id)?.length ?? 0;
    }
  }
  const cx = { ...vazias(nCaixas), ids: new Array<string>(nCaixas), meta: new Int32Array(nCaixas * 4), porId: new Map<string, number>() };
  const prat = vazias(nPrat);
  const mont = vazias(nMont);
  const faixas = vazias(bases.length);
  const modulosLeiaute: ModuloLeiaute[] = [];
  const porModulo = new Map<string, ModuloLeiaute>();

  const colocar = (inst: Instancias, i: number, ret: Retangulo, y: number, altura: number) => {
    inst.centro[i * 3] = (ret.x + ret.w / 2) * CELULA;
    inst.centro[i * 3 + 1] = y + altura / 2;
    inst.centro[i * 3 + 2] = (ret.y + ret.h / 2) * CELULA;
    inst.tamanho[i * 3] = ret.w * CELULA;
    inst.tamanho[i * 3 + 1] = altura;
    inst.tamanho[i * 3 + 2] = ret.h * CELULA;
  };
  // Retângulo local (u0..u1, v0..v1) da rua -> retângulo na planta.
  const retLocal = (b: Base, u0: number, v0: number, u1: number, v1: number): Retangulo => {
    const [ax, ay] = projetar(b.giro, b.mods.length, b.lados, b.x as number, b.y as number, u0, v0);
    const [bx, by] = projetar(b.giro, b.mods.length, b.lados, b.x as number, b.y as number, u1, v1);
    return { x: Math.min(ax, bx), y: Math.min(ay, by), w: Math.abs(bx - ax), h: Math.abs(by - ay) };
  };

  let ic = 0;
  let ip = 0;
  let im = 0;
  bases.forEach((b, ri) => {
    const nMods = b.mods.length;
    b.mods.forEach((m, mi) => {
      const ns = (niveisPorModulo.get(m.id) ?? []).sort((a, c) => a.numero - c.numero);
      const modulo: ModuloLeiaute = { id: m.id, ruaId: b.id, numero: m.numero, niveis: ns.length, caixas: 0, primeira: -1, ...retLocal(b, mi, 0, mi + 1, b.lados) };
      modulosLeiaute.push(modulo);
      porModulo.set(`${b.id}:${m.numero}`, modulo);
      const inicio = ic;
      // Prateleiras (uma tábua por nível).
      for (const n of ns) {
        colocar(prat, ip++, retLocal(b, mi, 0, mi + 1, b.lados), (n.numero - 1) * ALTURA_NIVEL, 0.06);
      }
      // Montantes nos quatro cantos.
      for (const [u, v] of [[0.02, 0.02], [0.98, 0.02], [0.02, b.lados - 0.02], [0.98, b.lados - 0.02]] as const) {
        colocar(mont, im++, retLocal(b, mi + u - 0.015, v - 0.015, mi + u + 0.015, v + 0.015), 0, Math.max(ns.length, 1) * ALTURA_NIVEL);
      }
      // Caixas de cada nível, em grade de duas fileiras (frente e fundo).
      for (const n of ns) {
        const lista = (caixasPorNivel.get(n.id) ?? []).sort((a, c) => a.numero - c.numero);
        const maior = lista.length ? lista[lista.length - 1].numero : 0;
        const cap = Math.max(n.capacidade, maior, 1);
        const colunas = Math.ceil(cap / 2);
        const colunas1 = b.lados === 1 ? cap : colunas;
        const fileiras = b.lados === 1 ? 1 : Math.ceil(cap / colunas);
        const bu = (1 - 2 * MARGEM) / colunas1;
        const bv = (b.lados - 2 * MARGEM) / fileiras;
        const alturaCaixa = ALTURA_NIVEL * 0.7;
        for (const c of lista) {
          const slot = c.numero - 1;
          const col = slot % colunas1;
          const fil = Math.floor(slot / colunas1);
          const u0 = mi + MARGEM + col * bu + bu * 0.06;
          const v0 = MARGEM + fil * bv + bv * 0.06;
          colocar(cx, ic, retLocal(b, u0, v0, u0 + bu * 0.88, v0 + bv * 0.88), (n.numero - 1) * ALTURA_NIVEL + 0.08, alturaCaixa);
          cx.ids[ic] = c.id;
          cx.meta[ic * 4] = ri;
          cx.meta[ic * 4 + 1] = m.numero;
          cx.meta[ic * 4 + 2] = n.numero;
          cx.meta[ic * 4 + 3] = c.numero;
          cx.porId.set(c.id, ic);
          ic++;
        }
      }
      modulo.caixas = ic - inicio;
      modulo.primeira = ic > inicio ? inicio : -1;
    });
    // Faixa de segurança no chão, ao longo da frente da rua.
    colocar(faixas, ri, retLocal(b, 0, b.lados + 0.02, nMods, b.lados + 0.14), 0, 0.02);
  });

  return {
    largura,
    profundidade,
    metros: planta.metrosCelula,
    elementos: planta.elementos,
    entrada: { lado: planta.entradaLado ?? "frente", posicao: planta.entradaPosicao ?? 2, largura: LARGURA_ENTRADA },
    ruas,
    modulos: modulosLeiaute,
    porModulo,
    caixas: cx,
    prateleiras: prat,
    montantes: mont,
    faixas,
  };
}

// Módulo a que a instância pertence.
export function moduloDaInstancia(l: Leiaute, i: number) {
  return l.porModulo.get(`${l.ruas[l.caixas.meta[i * 4]].id}:${l.caixas.meta[i * 4 + 1]}`) ?? null;
}

// Endereço de uma instância de caixa (para o rótulo e o anúncio).
export function enderecoDaInstancia(l: Leiaute, i: number) {
  const rua = l.ruas[l.caixas.meta[i * 4]];
  return { rua: rua.codigo, modulo: l.caixas.meta[i * 4 + 1], nivel: l.caixas.meta[i * 4 + 2], caixa: l.caixas.meta[i * 4 + 3] };
}

// Centro de uma caixa no mundo 3D (para a câmera ir até ela).
export function centroDaCaixa(l: Leiaute, i: number): [number, number, number] {
  return [l.caixas.centro[i * 3], l.caixas.centro[i * 3 + 1], l.caixas.centro[i * 3 + 2]];
}

// Vizinhos para o teclado: mesma rua e módulo; muda caixa, nível ou módulo.
export function vizinha(l: Leiaute, i: number, direcao: "esq" | "dir" | "cima" | "baixo" | "modulo+" | "modulo-"): number {
  const m = l.caixas.meta;
  const [r, mod, niv, cai] = [m[i * 4], m[i * 4 + 1], m[i * 4 + 2], m[i * 4 + 3]];
  const procurar = (alvo: (j: number) => boolean, ordem: (j: number) => number) => {
    let melhor = -1;
    let valor = Infinity;
    for (let j = 0; j < l.caixas.n; j++) {
      if (alvo(j) && ordem(j) < valor) {
        valor = ordem(j);
        melhor = j;
      }
    }
    return melhor;
  };
  const igualRua = (j: number) => m[j * 4] === r;
  switch (direcao) {
    case "dir":
      return procurar((j) => igualRua(j) && m[j * 4 + 1] === mod && m[j * 4 + 2] === niv && m[j * 4 + 3] > cai, (j) => m[j * 4 + 3]);
    case "esq":
      return procurar((j) => igualRua(j) && m[j * 4 + 1] === mod && m[j * 4 + 2] === niv && m[j * 4 + 3] < cai, (j) => -m[j * 4 + 3]);
    case "cima":
      return procurar((j) => igualRua(j) && m[j * 4 + 1] === mod && m[j * 4 + 2] > niv, (j) => m[j * 4 + 2] * 1000 + Math.abs(m[j * 4 + 3] - cai));
    case "baixo":
      return procurar((j) => igualRua(j) && m[j * 4 + 1] === mod && m[j * 4 + 2] < niv, (j) => -m[j * 4 + 2] * 1000 + Math.abs(m[j * 4 + 3] - cai));
    case "modulo+":
      return procurar((j) => igualRua(j) && m[j * 4 + 1] > mod, (j) => m[j * 4 + 1] * 1e6 + Math.abs(m[j * 4 + 2] - niv) * 1000 + Math.abs(m[j * 4 + 3] - cai));
    default:
      return procurar((j) => igualRua(j) && m[j * 4 + 1] < mod, (j) => -m[j * 4 + 1] * 1e6 + Math.abs(m[j * 4 + 2] - niv) * 1000 + Math.abs(m[j * 4 + 3] - cai));
  }
}

/** Zoom de destino: o atual vezes o fator, preso entre o mínimo e o máximo. */
export function zoomAlvo(atual: number, fator: number, min: number, max: number) {
  return Math.min(max, Math.max(min, atual * fator));
}
