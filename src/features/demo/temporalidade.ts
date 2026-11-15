// Temporalidade fictícia do modo demonstração. As seis linhas do quadro ficam em
// REGRAS_DEMO (movimento.ts, só exibição); aqui estão as regras editáveis, uma
// por tipo de documento que o sistema cadastra. Sem banco e sem salvar nada.
import type { Regra } from "@/features/temporalidade/regras";

export const REGRAS_EDITAVEIS_DEMO: Regra[] = [
  { classe: "licitacao", corrente: 2, intermediaria: 5, destinacao: "eliminacao" },
  { classe: "contrato", corrente: 5, intermediaria: 5, destinacao: "eliminacao" },
  { classe: "dispensa_inexigibilidade", corrente: 2, intermediaria: 3, destinacao: "eliminacao" },
];
