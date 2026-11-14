import { z } from "zod";
import { idSchema } from "@/features/login/esquemas";
import { GIROS, LIMITES_PLANTA } from "./tipos";

// Entrada validada no servidor antes de qualquer gravação (limites iguais aos
// do banco, supabase/migrations/20261115120000_mapa.sql).
const celula = z.number().int().min(0).max(LIMITES_PLANTA.maxCelula);
const tamanho = z.number().int().min(1).max(LIMITES_PLANTA.maxGalpao);
const giro = z.number().refine((v): v is 0 | 90 | 180 | 270 => (GIROS as readonly number[]).includes(v), "Giro inválido.");

const rua = z
  .object({ id: idSchema, x: celula.nullable(), y: celula.nullable(), giro })
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
