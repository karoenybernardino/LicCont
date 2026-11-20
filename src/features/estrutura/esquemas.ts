import { z } from "zod";
import { idSchema } from "@/features/login/esquemas";

// Limites iguais aos do banco (supabase/migrations/20261108200000_estrutura_fisica.sql).
// Cada nível comporta 6 caixas (regra do arquivo); os níveis por módulo vêm de caixas_por_modulo (30 ou 36).
export const LIMITES = { modulos: 20, niveis: 10, caixasPorNivel: 6, capacidade: 6, caixasPorVez: 6 } as const;

const inteiro = (min: number, max: number) => z.coerce.number().int().min(min).max(max);

export const esquemaGalpao = z.object({
  nome: z.string().trim().min(3, "Informe o nome do galpão (3 letras ou mais).").max(80, "Nome muito longo."),
});

export const esquemaRua = z.object({ galpao: idSchema });

export const esquemaModulos = z.object({
  rua: idSchema,
  modulos: inteiro(1, LIMITES.modulos),
});

export const esquemaCapacidade = z.object({ id: idSchema, capacidade: inteiro(1, LIMITES.capacidade) });

export const esquemaCaixas = z.object({ nivel: idSchema, quantidade: inteiro(1, LIMITES.caixasPorVez) });

export const TABELAS = ["galpoes", "ruas", "modulos", "niveis", "caixas"] as const;
export const esquemaSituacao = z.object({
  tabela: z.enum(TABELAS),
  id: idSchema,
  ativo: z.enum(["sim", "nao"]).transform((v) => v === "sim"),
});

// Erros do banco (códigos da migração) em português, sem detalhe técnico.
export function mensagemErro(codigo: string | undefined) {
  switch (codigo) {
    case "LC001":
      return "Não há posição livre suficiente neste nível.";
    case "LC002":
      return "A capacidade não pode ficar menor que as caixas já guardadas no nível.";
    case "LC003":
      return "Ainda há caixas ativas aqui. Desative as caixas antes.";
    case "LC004":
      return "Esta parte da estrutura está desativada.";
    case "LC006":
      return "Não foi possível mover. Nenhum documento foi movido.";
    case "42501":
      return "Você não tem permissão para isto.";
    case "23505":
      return "Já existe com este nome ou código. Atualize a página e tente de novo.";
    default:
      return "Não foi possível salvar.";
  }
}
