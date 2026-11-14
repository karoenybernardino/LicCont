import { z } from "zod";
import type { Vista } from "./tipos";

// Parâmetros do mapa, todos validados: ?galpao=, ?caixa=, ?doc=, ?vista=,
// ?codigos= (caixas destacadas pela pesquisa, até 50).
const uuid = z.guid();
const codigo = z.string().regex(/^[A-Z]{1,2}-M\d{1,2}-N\d{1,2}-C\d{2,3}$/);

export type ParametrosMapa = {
  galpao: string | null;
  caixa: string | null;
  doc: string | null;
  vista: Vista | null;
  codigos: string[];
  grande: boolean;
};

function um(v: string | string[] | undefined) {
  return typeof v === "string" ? v : undefined;
}

export function lerParametros(p: Record<string, string | string[] | undefined>): ParametrosMapa {
  const id = (v: string | string[] | undefined) => {
    const r = uuid.safeParse(um(v));
    return r.success ? r.data : null;
  };
  const vista = z.enum(["3d", "planta", "corredor"]).safeParse(um(p.vista));
  const codigos = (um(p.codigos) ?? "")
    .split(",")
    .map((c) => c.trim().toUpperCase())
    .filter((c) => codigo.safeParse(c).success)
    .slice(0, 50);
  // "grande" só vale na demonstração; fora dela a página ignora o parâmetro.
  const galpao = um(p.galpao);
  return {
    galpao: galpao === "grande" ? null : id(p.galpao),
    caixa: id(p.caixa),
    doc: id(p.doc),
    vista: vista.success ? vista.data : null,
    codigos,
    grande: galpao === "grande",
  };
}

export function urlMapa(o: { galpao?: string | null; grande?: boolean; caixa?: string | null; doc?: string | null; vista?: Vista | null; codigos?: string[] }) {
  const q = new URLSearchParams();
  if (o.grande) q.set("galpao", "grande");
  else if (o.galpao) q.set("galpao", o.galpao);
  if (o.caixa) q.set("caixa", o.caixa);
  if (o.doc) q.set("doc", o.doc);
  if (o.vista && o.vista !== "3d") q.set("vista", o.vista);
  if (o.codigos?.length) q.set("codigos", o.codigos.slice(0, 50).join(","));
  const s = q.toString();
  return s ? `/mapa?${s}` : "/mapa";
}

// "Voltar ao documento" só existe quando se chegou por um documento.
export const caminhoDeVolta = (doc: string | null) => (doc ? `/documentos/${doc}` : null);
