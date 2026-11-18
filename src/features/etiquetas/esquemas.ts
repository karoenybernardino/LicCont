import { z } from "zod";

// ?caixas=<id>,<id> e ?documentos=<id>,<id>: o que já vem marcado ao abrir a tela (vindo do cadastro ou do mapa).
export function lerCaixasDaUrl(v: string | undefined): string[] {
  const ids = (v ?? "").split(",").filter((x) => z.guid().safeParse(x).success);
  return [...new Set(ids)].slice(0, 500);
}

// Folhas de papel de cada tipo: caixa 2 por folha deitada, documento 4 por folha em pé,
// conteúdo uma ou mais folhas por caixa (14 linhas por folha).
export const folhasDeCaixas = (n: number) => Math.ceil(n / 2);
export const folhasDeDocumentos = (n: number) => Math.ceil(n / 4);

// Folha de conteúdo: 14 linhas por folha, quantas folhas forem precisas.
export const LINHAS_POR_FOLHA = 14;
export const folhasDoConteudo = (itens: number) => Math.max(1, Math.ceil(itens / LINHAS_POR_FOLHA));
