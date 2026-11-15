import { z } from "zod";
import { idSchema } from "@/features/login/esquemas";
import { LIMITES } from "@/features/estrutura/esquemas";
import { GIROS, LIMITES_METROS_CELULA, LIMITES_PLANTA } from "./tipos";

// Entrada validada no servidor antes de qualquer gravação (limites iguais aos
// do banco, supabase/migrations/20261115120000_mapa.sql).
const celula = z.number().int().min(0).max(LIMITES_PLANTA.maxCelula);
const tamanho = z.number().int().min(1).max(LIMITES_PLANTA.maxGalpao);
const giro = z.number().refine((v): v is 0 | 90 | 180 | 270 => (GIROS as readonly number[]).includes(v), "Giro inválido.");

const rua = z
  .object({ id: idSchema, x: celula.nullable(), y: celula.nullable(), giro, lados: z.union([z.literal(1), z.literal(2)]).default(2) })
  .refine((r) => (r.x === null) === (r.y === null), "Posição incompleta.");

const elemento = z.object({
  id: idSchema.nullable(),
  tipo: z.enum(["porta", "pilar", "parede", "area"]),
  rotulo: z.string().trim().max(40, "Nome muito longo.").nullable(),
  x: celula,
  y: celula,
  largura: tamanho,
  profundidade: tamanho,
  giro,
  ativo: z.boolean(),
});

export const esquemaPlantaEntrada = z.object({
  galpao: idSchema,
  largura: z.number().int().min(LIMITES_PLANTA.minGalpao).max(LIMITES_PLANTA.maxGalpao),
  profundidade: z.number().int().min(LIMITES_PLANTA.minGalpao).max(LIMITES_PLANTA.maxGalpao),
  entradaLado: z.enum(["frente", "fundo", "esquerda", "direita"]),
  entradaPosicao: celula,
  metrosCelula: z.number().min(LIMITES_METROS_CELULA.min).max(LIMITES_METROS_CELULA.max),
  ruas: z.array(rua).max(500),
  elementos: z.array(elemento).max(LIMITES_PLANTA.maxElementos),
});
export type PlantaEntrada = z.infer<typeof esquemaPlantaEntrada>;

export const esquemaMover = z
  .object({ documentos: z.array(idSchema).min(1).max(200), destino: idSchema })
  .refine((d) => new Set(d.documentos).size === d.documentos.length, "Documento repetido.");

export const esquemaCaixa = z.object({ id: idSchema });
export const esquemaBusca = z.object({ q: z.string().trim().min(1).max(60) });
export const esquemaEscopo = z.object({ nivel: idSchema.optional(), modulo: idSchema.optional(), rua: idSchema.optional() });
export const esquemaOcupacao = z.object({ galpao: idSchema, grande: z.boolean().optional() });

// Estrutura pelo editor da planta (só administrador): rua nova já com módulos, e
// mais ou menos módulos numa rua que existe. Limites iguais aos de Estrutura física.
export const esquemaNovaRua = z.object({
  galpao: idSchema,
  modulos: z.number().int().min(1).max(LIMITES.modulos),
  niveis: z.number().int().min(1).max(LIMITES.niveis),
  capacidade: z.number().int().min(1).max(LIMITES.caixasPorNivel),
});
export const esquemaAjusteModulos = z.object({
  rua: idSchema,
  quantidade: z.number().int().min(-LIMITES.modulos).max(LIMITES.modulos).refine((n) => n !== 0, "Informe quantos módulos."),
});
