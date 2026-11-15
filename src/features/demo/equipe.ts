// Dados fictícios da área da equipe (modo demonstração). Nada daqui é real.
import { PREFEITURAS_DEMO } from "./dados";

const h = (dias: number, hora = 9) => new Date(Date.UTC(2026, 10, 15 - dias, hora + 3, 0)).toISOString();

export const PEDIDOS_DEMO = [
  { id: "de900000-0000-0000-0000-000000000001", nome: "Pessoa Fictícia 1", cargo: "Secretária de Administração", orgao: "Prefeitura de Juazeiro (exemplo)", email: "contato1@exemplo.test", telefone: "(00) 00000-0000", mensagem: "Queremos conhecer o sistema para organizar o arquivo de licitações e contratos.", situacao: "novo", demoEm: null, responsavel: null, criadoEm: h(3) },
  { id: "de900000-0000-0000-0000-000000000002", nome: "Pessoa Fictícia 2", cargo: "Presidência", orgao: "Câmara de Crato (exemplo)", email: "contato2@exemplo.test", telefone: null, mensagem: null, situacao: "novo", demoEm: null, responsavel: null, criadoEm: h(2) },
  { id: "de900000-0000-0000-0000-000000000003", nome: "Pessoa Fictícia 3", cargo: "Procuradoria", orgao: "Prefeitura de Barbalha (exemplo)", email: "contato3@exemplo.test", telefone: null, mensagem: null, situacao: "contato", demoEm: null, responsavel: "Equipe", criadoEm: h(1) },
] as const;

export const INTEGRACOES_DEMO = PREFEITURAS_DEMO.map((p, i) => ({
  prefeituraId: p.id,
  ativo: i < 2,
  situacao: i === 0 ? ("erro" as const) : i === 1 ? ("ok" as const) : null,
  ultimaEm: i < 2 ? h(0, 2) : null,
  novos: i === 1 ? 31 : 0,
  erros7d: i === 0 ? 1 : 0,
}));

export const ACOES_DEMO = [
  { id: 3, criadoEm: h(0, 2), quem: "Sistema", acao: "tce.importar", statusNovo: null, prefeitura: PREFEITURAS_DEMO[0].nome, ip: null },
  { id: 2, criadoEm: h(7), quem: "Equipe LicCONT", acao: "prefeituras.insert", statusNovo: null, prefeitura: PREFEITURAS_DEMO[2].nome, ip: "203.0.113.5" },
  { id: 1, criadoEm: h(14), quem: "Equipe LicCONT", acao: "prefeituras.insert", statusNovo: null, prefeitura: PREFEITURAS_DEMO[0].nome, ip: "203.0.113.5" },
];
