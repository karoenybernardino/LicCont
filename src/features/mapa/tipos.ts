// Vocabulário do mapa (plano: docs/fases/fase-4.md). Sem React e sem banco:
// serve ao servidor, ao navegador e aos testes.

export type Giro = 0 | 90 | 180 | 270;
export const GIROS: readonly Giro[] = [0, 90, 180, 270];

export type LadoEntrada = "frente" | "fundo" | "esquerda" | "direita";
export const LADOS: Record<LadoEntrada, string> = { frente: "Frente", fundo: "Fundo", esquerda: "Esquerda", direita: "Direita" };

export type TipoElemento = "porta" | "pilar" | "parede" | "area";
export const TIPOS_ELEMENTO: Record<TipoElemento, string> = { porta: "Porta", pilar: "Pilar", parede: "Parede", area: "Área com nome" };

export type ElementoPlanta = {
  id: string;
  tipo: TipoElemento;
  rotulo: string | null;
  x: number;
  y: number;
  largura: number;
  profundidade: number;
  giro: Giro;
};

/** Lados com estante: 2 = rua no meio do galpão; 1 = encostada na parede (uma fileira de caixas). */
export type Lados = 1 | 2;
export type PosicaoRua = { x: number | null; y: number | null; giro: Giro; lados?: Lados };

// Planta salva do galpão. Tudo opcional: vazio = desenho automático.
export type Planta = {
  largura: number | null;
  profundidade: number | null;
  entradaLado: LadoEntrada | null;
  entradaPosicao: number | null;
  /** Metros que uma célula de módulo mede no galpão real (null = padrão). */
  metrosCelula: number | null;
  ruas: Record<string, PosicaoRua>;
  elementos: ElementoPlanta[];
};

export const PLANTA_VAZIA: Planta = { largura: null, profundidade: null, entradaLado: null, entradaPosicao: null, metrosCelula: null, ruas: {}, elementos: [] };

// Caixa ativa do galpão, na forma compacta que vai ao navegador.
export type CaixaCompacta = { id: string; nivelId: string; numero: number };

/** Largura usual de um módulo de estante de arquivo, em metros. */
export const PADRAO_METROS_CELULA = 1.2;
export const LIMITES_METROS_CELULA = { min: 0.25, max: 5 } as const;

/** 7,2 m, com vírgula e no máximo duas casas. */
export function formatarMetros(m: number): string {
  return `${(Math.round(m * 100) / 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} m`;
}

export const LIMITES_PLANTA = { minGalpao: 4, maxGalpao: 200, maxCelula: 199, maxElementos: 200 } as const;

// Faixas de ocupação da caixa (mesmos cortes do cadastro da Fase 3).
export type Faixa = 0 | 1 | 2 | 3;
export const FAIXAS: { faixa: Faixa; rotulo: string }[] = [
  { faixa: 0, rotulo: "Abaixo de 50%" },
  { faixa: 1, rotulo: "50% a 89%" },
  { faixa: 2, rotulo: "90% a 100%" },
  { faixa: 3, rotulo: "Acima de 100%" },
];

export type Vista = "3d" | "planta" | "corredor";
export const VISTAS: Record<Vista, string> = { "3d": "Perspectiva", planta: "Planta", corredor: "Corredor" };
