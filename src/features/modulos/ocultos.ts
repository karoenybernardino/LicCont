// Funções escondidas por decisão do produto. O código continua no repositório: para religar,
// troque o valor para `true` (ou defina NEXT_PUBLIC_LICCONT_MODULOS=relatorios,tce,pncp). Rotas bloqueadas em `src/proxy.ts`.
const LIGADOS = new Set((process.env.NEXT_PUBLIC_LICCONT_MODULOS ?? "").split(",").map((s) => s.trim()).filter(Boolean));

export const MODULOS = {
  relatorios: LIGADOS.has("relatorios"),
  tce: LIGADOS.has("tce"),
  pncp: LIGADOS.has("pncp"),
};

const ROTAS: [keyof typeof MODULOS, string][] = [
  ["relatorios", "/relatorios"],
  ["tce", "/importados"],
  ["tce", "/configuracoes/tce"],
  ["tce", "/api/tce"],
  ["tce", "/equipe/integracoes"],
  ["pncp", "/importados"],
];

// true se o caminho pertence a um módulo escondido (/importados só abre se o TCE e o PNCP estiverem ligados).
export function rotaOculta(caminho: string): boolean {
  return ROTAS.some(([m, base]) => !MODULOS[m] && (caminho === base || caminho.startsWith(`${base}/`)));
}
