// Dados fictícios da empresa parceira (modo demonstração). Nada daqui é real.
import type { Linha, Resumo } from "@/features/parceira/indicadores";

const id = (n: number) => `de8a0000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const h = (dias: number, hora = 9) => new Date(Date.UTC(2026, 10, 15 - dias, hora + 3, 0)).toISOString();

export const PARCEIRA_DEMO = { id: "de830000-0000-0000-0000-000000000001", nome: "Empresa Parceira Exemplo" };

export const PREFS_PARCEIRA_DEMO: Resumo[] = [
  { id: id(1), nome: "Caririaçu/CE", caixas: 412, caixasPrefeitura: 380, caixasCamara: 32, documentos: 3842, aEtiquetar: 38, funcionarios: 2, modulos: 16, caixasPorModulo: 36, ultimaAtividade: h(0) },
  { id: id(2), nome: "Juazeiro do Norte/CE", caixas: 1206, caixasPrefeitura: 1100, caixasCamara: 106, documentos: 11420, aEtiquetar: 112, funcionarios: 2, modulos: 35, caixasPorModulo: 36, ultimaAtividade: h(1) },
  { id: id(3), nome: "Barbalha/CE", caixas: 530, caixasPrefeitura: 500, caixasCamara: 30, documentos: 5118, aEtiquetar: 0, funcionarios: 1, modulos: 20, caixasPorModulo: 36, ultimaAtividade: h(3) },
  { id: id(4), nome: "Missão Velha/CE", caixas: 288, caixasPrefeitura: 288, caixasCamara: 0, documentos: 2760, aEtiquetar: 54, funcionarios: 1, modulos: 9, caixasPorModulo: 36, ultimaAtividade: h(5) },
  { id: id(5), nome: "Câmara de Crato/CE", caixas: 96, caixasPrefeitura: 0, caixasCamara: 96, documentos: 840, aEtiquetar: 8, funcionarios: 1, modulos: 5, caixasPorModulo: 30, ultimaAtividade: h(8) },
];

// Pessoas da empresa. Ana (funcionária da demonstração) está alocada em duas prefeituras.
export type PessoaParceira = {
  id: string;
  nome: string;
  email: string | null;
  papel: "dono" | "funcionario";
  ativa: boolean;
  trocaSenha: boolean;
  prefeituras: { id: string; nome: string; alocadoPor: string }[];
};
const nomePref = (n: number) => PREFS_PARCEIRA_DEMO[n - 1]!.nome;
export const PESSOAS_PARCEIRA_DEMO: PessoaParceira[] = [
  { id: id(11), nome: "Marcos Tavares", email: "marcos.tavares@parceira.exemplo", papel: "dono", ativa: true, trocaSenha: false, prefeituras: [] },
  { id: id(12), nome: "Ana Souza", email: "ana.souza@parceira.exemplo", papel: "funcionario", ativa: true, trocaSenha: false, prefeituras: [{ id: id(1), nome: nomePref(1), alocadoPor: "Marcos Tavares" }, { id: id(2), nome: nomePref(2), alocadoPor: "Marcos Tavares" }] },
  { id: id(13), nome: "Bruno Lima", email: "bruno.lima@parceira.exemplo", papel: "funcionario", ativa: true, trocaSenha: false, prefeituras: [{ id: id(3), nome: nomePref(3), alocadoPor: "Marcos Tavares" }, { id: id(2), nome: nomePref(2), alocadoPor: "Marcos Tavares" }] },
  { id: id(14), nome: "Carla Mendes", email: "carla.mendes@parceira.exemplo", papel: "funcionario", ativa: true, trocaSenha: false, prefeituras: [{ id: id(4), nome: nomePref(4), alocadoPor: "Equipe LicCONT" }, { id: id(5), nome: nomePref(5), alocadoPor: "Equipe LicCONT" }] },
  { id: id(15), nome: "Diego Alves", email: "diego.alves@parceira.exemplo", papel: "funcionario", ativa: true, trocaSenha: true, prefeituras: [] },
];
export const PESSOA_DEMO_FUNC = PESSOAS_PARCEIRA_DEMO[1]!;
export const PESSOA_DEMO_DONO = PESSOAS_PARCEIRA_DEMO[0]!;

// Atividade das últimas semanas, determinística: (dia, pessoa, prefeitura) -> números.
const ALOC: Record<string, number[]> = { "Ana Souza": [1, 2], "Bruno Lima": [3, 2], "Carla Mendes": [4, 5] };
export function linhasDemo(prefeituras: string[]): Linha[] {
  const out: Linha[] = [];
  for (let d = 0; d < 56; d++) {
    const data = new Date(Date.UTC(2026, 10, 15 - d));
    if (data.getUTCDay() === 0 || data.getUTCDay() === 6) continue;
    const dia = data.toISOString().slice(0, 10);
    for (const [pessoa, prefs] of Object.entries(ALOC)) {
      for (const p of prefs) {
        if (!prefeituras.includes(id(p))) continue;
        const seed = (d * 7 + p * 3 + pessoa.length) % 6;
        const camara = p === 5;
        out.push({ dia, usuarioId: id(100 + p), pessoa, orgao: camara ? "camara" : "prefeitura", caixas: seed, documentos: seed * 9 + 4, etiquetas: seed * 4 });
      }
    }
  }
  return out;
}

export const ATIVIDADE_RECENTE_DEMO = [
  { quem: "Ana Souza", texto: "imprimiu 24 etiquetas de caixa", onde: "Juazeiro do Norte", quando: "hoje, 10:12" },
  { quem: "Bruno Lima", texto: "imprimiu 12 etiquetas de documento", onde: "Barbalha", quando: "ontem, 16:40" },
  { quem: "Carla Mendes", texto: "gerou a folha de conteúdo da CX - 0212", onde: "Missão Velha", quando: "12/11, 09:05" },
  { quem: "Equipe LicCONT", texto: "alocou Carla Mendes em Câmara de Crato", onde: "Alocação", quando: "10/11, 14:30" },
];

export const CAIXAS_A_ETIQUETAR_DEMO = [
  { id: id(201), rotulo: "CX - 0214", descricao: "Licitação – 2026 · Vol. 1/2", prefeituraId: id(1), prefeitura: "Caririaçu" },
  { id: id(202), rotulo: "CX - 0215", descricao: "Contrato – 2025", prefeituraId: id(1), prefeitura: "Caririaçu" },
  { id: id(203), rotulo: "CX - 0388", descricao: "Pregão – 2025", prefeituraId: id(2), prefeitura: "Juazeiro do Norte" },
  { id: id(204), rotulo: "CX - 0212", descricao: "Dispensa – 2024", prefeituraId: id(4), prefeitura: "Missão Velha" },
];

export const DOCUMENTOS_PARCEIRA_DEMO = [
  { id: id(301), tipo: "licitacao", numero: "012/2025", ano: 2025, objeto: "Aquisição de material de expediente (fictício)", prefeituraId: id(1), caixa: "CX - 0214" },
  { id: id(302), tipo: "contrato", numero: "044/2025", ano: 2025, objeto: "Serviço de limpeza urbana (fictício)", prefeituraId: id(2), caixa: "CX - 0388" },
  { id: id(303), tipo: "licitacao", numero: "007/2024", ano: 2024, objeto: "Obra de reforma de escola (fictício)", prefeituraId: id(3), caixa: "CX - 0101" },
  { id: id(304), tipo: "contrato", numero: "019/2024", ano: 2024, objeto: "Locação de veículos (fictício)", prefeituraId: id(4), caixa: "CX - 0212" },
];
