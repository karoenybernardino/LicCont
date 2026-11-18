// Temporalidade fictícia do modo demonstração. As seis linhas do quadro ficam em
// REGRAS_DEMO (movimento.ts, só exibição); aqui estão as regras editáveis, uma
// por tipo de documento que o sistema cadastra, e os termos dos quadros. Sem
// banco e sem salvar nada.
import { somarDias, type Regra } from "@/features/temporalidade/regras";
import type { ItemTermo, TermoCompleto } from "@/features/temporalidade/tipos";
import { SECRETARIAS_DEMO } from "./dados";
import { CLASSES_DEMO } from "./classificacao";

export const REGRAS_EDITAVEIS_DEMO: Regra[] = CLASSES_DEMO;

const secretaria = (nome: string) => SECRETARIAS_DEMO.find((s) => s.nome.startsWith(nome))?.id ?? SECRETARIAS_DEMO[0].id;
const item = (titulo: string, objeto: string, extremos: string, caixa: string, vencimento: string, classe: string): ItemTermo => ({
  titulo, objeto, caixa, classe, extremos, vencimento, inicio: null, fim: null,
});

const base = { geradoPor: "de200000-0000-0000-0000-000000000001", prefeitura: "Prefeitura Fictícia de Exemplo", observacao: null, canceladoEm: null, aprovadoEm: null };
const id = (n: number) => `de700000-0000-0000-0000-${String(n).padStart(12, "0")}`;

const SAUDE = [
  item("Dispensa 003/2016", "Aquisição de material de expediente", "2016 – 2016", "D-M1-N1-C02", "2026-03-01", "Dispensas e inexigibilidades"),
  item("Contrato 019/2015", "Locação de veículos para a frota", "2015 – 2018", "D-M1-N1-C05", "2026-05-01", "Contratos e aditivos"),
  item("Pregão Eletrônico 008/2016", "Medicamentos da atenção básica", "2016 – 2016", "D-M2-N1-C01", "2026-08-01", "Licitações e Contratos"),
  item("Dispensa 014/2016", "Manutenção de ar-condicionado", "2016 – 2016", "D-M2-N1-C03", "2026-09-01", "Dispensas e inexigibilidades"),
];

// Termo 005 tem o prazo de ciência correndo (quadro TermoAndamento): as datas
// saem de hoje, para o texto "Faltam N dias" ser sempre verdadeiro.
export function termosDemo(hoje: string): TermoCompleto[] {
  const edital005 = somarDias(hoje, -26);
  return [
    {
      ...base, id: id(5), numero: 5, ano: 2026, situacao: "em_ciencia", secretariaId: secretaria("Saúde"), secretaria: "Saúde",
      geradoEm: `${somarDias(edital005, -2)}T12:00:00Z`, editalEm: edital005, itens: 4, documentos: SAUDE,
    },
    {
      ...base, id: id(4), numero: 4, ano: 2026, situacao: "rascunho", secretariaId: secretaria("Obras"), secretaria: "Obras",
      geradoEm: "2026-11-10T12:00:00Z", editalEm: null, itens: 3,
      documentos: [
        item("Convite 002/2017", "Reforma da praça central", "2017 – 2017", "B-M4-N2-C01", "2026-06-01", "Licitações e Contratos"),
        item("Contrato 031/2016", "Pavimentação de ruas do bairro Centro", "2016 – 2019", "B-M4-N2-C03", "2026-07-01", "Contratos e aditivos"),
        item("Tomada de Preços 005/2017", "Construção de muro de arrimo", "2017 – 2017", "B-M4-N2-C03", "2026-10-01", "Licitações e Contratos"),
      ],
    },
    {
      ...base, id: id(3), numero: 3, ano: 2026, situacao: "em_ciencia", secretariaId: secretaria("Saúde"), secretaria: "Saúde",
      geradoEm: "2026-09-30T12:00:00Z", editalEm: "2026-10-01", itens: 4, documentos: SAUDE,
    },
    {
      ...base, id: id(2), numero: 2, ano: 2026, situacao: "aprovado", secretariaId: secretaria("Educação"), secretaria: "Educação",
      geradoEm: "2026-08-14T12:00:00Z", editalEm: "2026-08-15", aprovadoEm: "2026-09-30T12:00:00Z", itens: 4, documentos: SAUDE,
    },
    {
      ...base, id: id(1), numero: 1, ano: 2026, situacao: "cancelado", secretariaId: secretaria("Saúde"), secretaria: "Saúde",
      geradoEm: "2026-03-05T12:00:00Z", editalEm: null, canceladoEm: "2026-03-12T12:00:00Z", itens: 2, documentos: SAUDE.slice(0, 2),
    },
  ];
}

// A lista do painel mostra os quatro termos do quadro; o 005 só abre por endereço.
export const NUMERO_SO_POR_ENDERECO_DEMO = 5;
