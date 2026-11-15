import { z } from "zod";

export const TAMANHOS = { pequena: "Pequena 5×3", media: "Média 10×7" } as const;
export type Tamanho = keyof typeof TAMANHOS;

export const esquemaImpressao = z.object({
  caixas: z.array(z.guid()).min(1).max(200),
  tamanho: z.enum(["pequena", "media"]),
});

// ?caixas=<id>,<id>: caixas já marcadas ao abrir a tela (vindas do cadastro ou do mapa).
export function lerCaixasDaUrl(v: string | undefined): string[] {
  const ids = (v ?? "").split(",").filter((x) => z.guid().safeParse(x).success);
  return [...new Set(ids)].slice(0, 200);
}
