import "server-only";
import { clienteSessao } from "@/lib/supabase/servidor";
import type { Usuario } from "@/features/sessao/dal";
import { SECRETARIAS_DEMO, VINCULOS_DEMO, emDemo } from "@/features/demo/dados";
import { CAPACIDADE_CAIXA_DEMO, DOCUMENTOS_DEMO, caixaDemo, idCaixaDemo } from "@/features/demo/documentos";
import { ESTRUTURA_DEMO } from "@/features/demo/estrutura";
import { secretariasParaCadastro } from "@/features/documentos/dados";
import type { Modalidade, Tipo } from "@/features/documentos/tipos";
import { tituloDocumento } from "@/features/documentos/titulo";
import { todas } from "@/features/estrutura/dados";
import { codigoPosicao } from "@/features/estrutura/ocupacao";
import { galpaoGrande } from "./galpao-grande";
import { PLANTA_VAZIA, type CaixaCompacta, type ElementoPlanta, type Giro, type LadoEntrada, type Planta, type TipoElemento } from "./tipos";

// Leitura pela sessão da pessoa: o RLS devolve só a prefeitura dela e, nos
// documentos, só as secretarias permitidas. Demonstração: dados em memória.

const FALHA = "Não foi possível ler o mapa.";

// Caixas ativas do galpão (id, nível, número), em páginas de 1.000.
export async function caixasDoGalpao(galpaoId: string): Promise<CaixaCompacta[]> {
  if (emDemo()) {
    return ESTRUTURA_DEMO.niveis.flatMap((n) =>
      Array.from({ length: n.caixas }, (_, i) => ({ id: idCaixaDemo(n.id, i + 1), nivelId: n.id, numero: i + 1 })),
    );
  }
  const sb = await clienteSessao();
  if (!sb) return [];
  const linhas = await todas((de, ate) =>
    sb
      .from("caixas")
      .select("id, nivel_id, numero, niveis!inner(modulos!inner(ruas!inner(galpao_id)))")
      .eq("ativo", true)
      .eq("niveis.modulos.ruas.galpao_id", galpaoId)
      .order("id")
      .range(de, ate),
  );
  return linhas.map((c) => ({ id: c.id as string, nivelId: c.nivel_id as string, numero: c.numero as number }));
}

export const GALPAO_GRANDE = () => galpaoGrande();

// Planta salva (ou a fictícia da demonstração).
export async function plantaDoGalpao(galpaoId: string): Promise<Planta> {
  if (emDemo()) return PLANTA_DEMO;
  const sb = await clienteSessao();
  if (!sb) return PLANTA_VAZIA;
  const [g, r, e] = await Promise.all([
    sb.from("galpoes").select("planta_largura, planta_profundidade, entrada_lado, entrada_posicao, planta_metros_celula").eq("id", galpaoId).maybeSingle(),
    sb.from("ruas").select("id, planta_x, planta_y, planta_giro, planta_lados").eq("galpao_id", galpaoId),
    sb
      .from("planta_elementos")
      .select("id, tipo, rotulo, x, y, largura, profundidade, giro")
      .eq("galpao_id", galpaoId)
      .eq("ativo", true)
      .order("criado_em")
      .limit(200),
  ]);
  if (g.error || r.error || e.error) throw new Error(FALHA);
  return {
    largura: g.data?.planta_largura != null ? Number(g.data.planta_largura) : null,
    profundidade: g.data?.planta_profundidade != null ? Number(g.data.planta_profundidade) : null,
    entradaLado: (g.data?.entrada_lado as LadoEntrada | null) ?? null,
    entradaPosicao: g.data?.entrada_posicao != null ? Number(g.data.entrada_posicao) : null,
    metrosCelula: g.data?.planta_metros_celula != null ? Number(g.data.planta_metros_celula) : null,
    ruas: Object.fromEntries(
      (r.data ?? []).map((x) => [x.id as string, { x: x.planta_x != null ? Number(x.planta_x) : null, y: x.planta_y != null ? Number(x.planta_y) : null, giro: ((x.planta_giro as Giro | null) ?? 0) as Giro, lados: x.planta_lados === 1 ? (1 as const) : (2 as const) }]),
    ),
    elementos: (e.data ?? []).map((x) => ({
      id: x.id as string,
      tipo: x.tipo as TipoElemento,
      rotulo: (x.rotulo as string | null) ?? null,
      x: Number(x.x),
      y: Number(x.y),
      largura: Number(x.largura),
      profundidade: Number(x.profundidade),
      giro: x.giro as Giro,
    })),
  };
}

// Planta fictícia da demonstração, em metros (módulo de 1,20 m): galpão de
// 16,8 x 19,2 m, entrada na frente, um pilar e uma porta lateral. As ruas ficam sem posição (desenho automático) para o editor
// poder mostrar o estado "Automática" e o coordenador posicioná-las.
const ELEMENTOS_DEMO: ElementoPlanta[] = [
  { id: "de700000-0000-0000-0000-000000000001", tipo: "pilar", rotulo: null, x: 10.8, y: 4.8, largura: 1.2, profundidade: 1.2, giro: 0 },
  { id: "de700000-0000-0000-0000-000000000002", tipo: "porta", rotulo: "Porta lateral", x: 15.6, y: 6, largura: 1.2, profundidade: 2.4, giro: 0 },
];
export const PLANTA_DEMO: Planta = { ...PLANTA_VAZIA, metrosCelula: 1.2, largura: 16.8, profundidade: 19.2, entradaLado: "frente", entradaPosicao: 3.6, elementos: ELEMENTOS_DEMO };

export type LinhaDocumento = {
  id: string;
  titulo: string;
  empresa: string | null;
  secretaria: string;
  ano: number;
  situacao: string;
  conferido: boolean;
  marcavel: boolean;
};
export type DetalheCaixa = {
  id: string;
  rua: string;
  modulo: number;
  nivel: number;
  caixa: number;
  codigo: string;
  total: number;
  capacidade: number;
  documentos: LinhaDocumento[];
};

// Caixa selecionada: total (todas as secretarias, só o número) e a lista dos
// documentos que a pessoa pode ler. Caixa de outra prefeitura e caixa que não
// existe dão o mesmo resultado: null.
export async function detalheDaCaixa(u: Usuario, caixaId: string): Promise<DetalheCaixa | null> {
  const cadastra = new Set((await secretariasParaCadastro(u)).map((s) => s.id));
  if (emDemo()) {
    const cx = caixaDemo(caixaId);
    if (!cx || cx.numero > cx.nivel.caixas) return null;
    const todos = DOCUMENTOS_DEMO.filter((d) => d.caixa_id === caixaId);
    const permitidas = new Set(u.administrador ? SECRETARIAS_DEMO.map((s) => s.id) : VINCULOS_DEMO);
    return {
      id: caixaId,
      rua: cx.rua.codigo,
      modulo: cx.modulo.numero,
      nivel: cx.nivel.numero,
      caixa: cx.numero,
      codigo: codigoPosicao(cx.rua.codigo, cx.modulo.numero, cx.nivel.numero, cx.numero),
      total: todos.length,
      capacidade: CAPACIDADE_CAIXA_DEMO,
      documentos: todos
        .filter((d) => permitidas.has(d.secretaria_id))
        .map((d) => ({
          id: d.id,
          titulo: tituloDocumento({ tipo: d.tipo as Tipo, modalidade: d.modalidade as Modalidade | null, numero: d.numero, ano: d.ano }),
          empresa: d.empresa,
          secretaria: SECRETARIAS_DEMO.find((s) => s.id === d.secretaria_id)?.nome ?? "",
          ano: d.ano,
          situacao: d.situacao,
          conferido: d.conferido,
          marcavel: cadastra.has(d.secretaria_id),
        })),
    };
  }
  const sb = await clienteSessao();
  if (!sb) return null;
  const [oc, cx, docs] = await Promise.all([
    sb.rpc("ocupacao_caixas", { p_caixas: [caixaId] }),
    sb.from("caixas").select("id, numero, ativo, niveis(numero, modulos(numero, ruas(codigo)))").eq("id", caixaId).maybeSingle(),
    sb
      .from("documentos")
      .select("id, tipo, modalidade, numero, ano, empresa, situacao, conferido_em, secretaria_id, secretarias(nome)")
      .eq("caixa_id", caixaId)
      .eq("ativo", true)
      .order("criado_em", { ascending: false })
      .limit(200),
  ]);
  if (oc.error || cx.error || docs.error) throw new Error(FALHA);
  const total = (oc.data as { documentos: number; capacidade: number }[] | null)?.[0];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = cx.data as any;
  if (!total || !c || !c.ativo) return null;
  const [rua, modulo, nivel] = [c.niveis.modulos.ruas.codigo as string, c.niveis.modulos.numero as number, c.niveis.numero as number];
  return {
    id: caixaId,
    rua,
    modulo,
    nivel,
    caixa: c.numero,
    codigo: codigoPosicao(rua, modulo, nivel, c.numero),
    total: total.documentos,
    capacidade: total.capacidade,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    documentos: (docs.data as any[]).map((d) => ({
      id: d.id,
      titulo: tituloDocumento(d),
      empresa: d.empresa,
      secretaria: d.secretarias?.nome ?? "",
      ano: d.ano,
      situacao: d.situacao,
      conferido: !!d.conferido_em,
      marcavel: cadastra.has(d.secretaria_id),
    })),
  };
}

export type OcupacaoCaixa = { caixaId: string; documentos: number; capacidade: number };

// Ocupação do galpão inteiro numa chamada (só ao ligar "Mostrar ocupação").
export async function ocupacaoDoGalpao(galpaoId: string, grande = false): Promise<OcupacaoCaixa[]> {
  if (emDemo() && grande) {
    // Galpão grande de teste: não tem documentos; a ocupação é sintética.
    return galpaoGrande().caixas.map((c, i) => ({ caixaId: c.id, documentos: (i * 7) % 25, capacidade: CAPACIDADE_CAIXA_DEMO }));
  }
  if (emDemo()) {
    const base = ESTRUTURA_DEMO.niveis.flatMap((n) => Array.from({ length: n.caixas }, (_, i) => idCaixaDemo(n.id, i + 1)));
    const docs = new Map<string, number>();
    for (const d of DOCUMENTOS_DEMO) docs.set(d.caixa_id, (docs.get(d.caixa_id) ?? 0) + 1);
    return base.map((id) => ({ caixaId: id, documentos: docs.get(id) ?? 0, capacidade: CAPACIDADE_CAIXA_DEMO }));
  }
  const sb = await clienteSessao();
  if (!sb) return [];
  const { data, error } = await sb.rpc("ocupacao_galpao", { p_galpao: galpaoId });
  if (error) throw new Error(FALHA);
  return (data as { caixa_id: string; documentos: number; capacidade: number }[]).map((o) => ({
    caixaId: o.caixa_id,
    documentos: o.documentos,
    capacidade: o.capacidade,
  }));
}

// Id da caixa pela posição (nível + número), para a vista de frente da rua.
export async function idDaCaixaPorPosicao(nivelId: string, numero: number): Promise<string | null> {
  if (emDemo()) return idCaixaDemo(nivelId, numero);
  const sb = await clienteSessao();
  if (!sb) return null;
  const { data } = await sb.from("caixas").select("id").eq("nivel_id", nivelId).eq("numero", numero).eq("ativo", true).maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

// Galpão de uma caixa (para abrir o mapa pelo link ?caixa=). Caixa de outra
// prefeitura e caixa que não existe dão o mesmo resultado: null.
export async function galpaoDaCaixa(caixaId: string): Promise<string | null> {
  if (emDemo()) return caixaDemo(caixaId) ? (ESTRUTURA_DEMO.galpao?.id ?? null) : null;
  const sb = await clienteSessao();
  if (!sb) return null;
  const { data } = await sb.from("caixas").select("niveis(modulos(ruas(galpao_id)))").eq("id", caixaId).maybeSingle();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any)?.niveis?.modulos?.ruas?.galpao_id ?? null;
}
