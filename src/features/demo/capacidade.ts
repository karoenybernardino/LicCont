// Capacidade fictícia do modo demonstração: 4 ruas de 10 módulos, 36 caixas por módulo (1.440 caixas).
// Nada aqui é dado real e nada é salvo.
import { montarCapacidade, type CapacidadeBruta } from "@/features/estrutura/capacidade";

// Caixas ocupadas por módulo, em média, em cada rua (A quase cheia, D mais folgada).
const MEDIA_POR_RUA = { A: 34, B: 31, C: 27, D: 22 } as const;
const PESO_NIVEL = [0.22, 0.2, 0.18, 0.16, 0.14];

function bruta(): CapacidadeBruta {
  const por_modulo = Object.entries(MEDIA_POR_RUA).flatMap(([rua, media]) =>
    Array.from({ length: 10 }, (_, i) => ({ rua, modulo: i + 1, ocupadas: Math.min(36, media + ((i * 7) % 5) - 2) })),
  );
  const total = por_modulo.reduce((s, m) => s + m.ocupadas, 0);
  const niveis = PESO_NIVEL.map((p) => Math.round(total * p));
  niveis.push(total - niveis.reduce((s, n) => s + n, 0));
  return { caixas_por_modulo: 36, por_modulo, por_nivel: niveis.map((ocupadas, i) => ({ nivel: i + 1, ocupadas })) };
}

export const CAPACIDADE_DEMO = montarCapacidade(bruta());
