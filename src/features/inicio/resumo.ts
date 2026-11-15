import { resumir, type Estrutura } from "@/features/estrutura/ocupacao";

export type RuaOcupada = { codigo: string; percentual: number };

// Ocupação de cada rua ativa (barras do Início).
export function ocupacaoPorRua(e: Estrutura): RuaOcupada[] {
  return e.ruas.filter((r) => r.ativo).map((r) => ({ codigo: r.codigo, percentual: resumir(e, r.id).percentual }));
}

const QUASE_CHEIA = 85;

export function avisoRuas(ruas: RuaOcupada[]) {
  const cheias = ruas.filter((r) => r.percentual >= QUASE_CHEIA).map((r) => r.codigo);
  if (!cheias.length) return "Nenhuma rua quase cheia";
  if (cheias.length === 1) return `Rua ${cheias[0]} quase cheia`;
  return `Ruas ${cheias.slice(0, -1).join(", ")} e ${cheias.at(-1)} quase cheias`;
}

// "B-M3-N3-C02" vira "Rua B · M3 · N3 · C02".
export function posicaoLegivel(codigo: string) {
  const [rua, ...resto] = codigo.split("-");
  return [`Rua ${rua}`, ...resto].join(" · ");
}
