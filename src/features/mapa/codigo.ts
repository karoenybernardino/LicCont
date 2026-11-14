// Código digitado na busca do mapa: "B-M3-N3-C02", "b m3 n3 c2", "B", "B-M3".
export type CodigoLido = { rua: string; modulo?: number; nivel?: number; caixa?: number };

const PADRAO = /^([A-Z]{1,2})(?:[\s-]*M(\d{1,2}))?(?:[\s-]*N(\d{1,2}))?(?:[\s-]*C(\d{1,3}))?$/;

export function lerCodigo(texto: string): CodigoLido | null {
  const t = texto.trim().toUpperCase();
  if (!t || t.length > 20) return null;
  const m = PADRAO.exec(t);
  if (!m) return null;
  const [, rua, modulo, nivel, caixa] = m;
  // O endereço vem na ordem: nível só depois do módulo, caixa só depois do nível.
  if ((nivel && !modulo) || (caixa && !nivel)) return null;
  const n = (v: string | undefined) => (v === undefined ? undefined : Number(v));
  return { rua, modulo: n(modulo), nivel: n(nivel), caixa: n(caixa) };
}

export function formatarCodigo(c: CodigoLido) {
  let s = c.rua;
  if (c.modulo !== undefined) s += `-M${c.modulo}`;
  if (c.nivel !== undefined) s += `-N${c.nivel}`;
  if (c.caixa !== undefined) s += `-C${String(c.caixa).padStart(2, "0")}`;
  return s;
}
