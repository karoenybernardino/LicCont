// Documentos fictícios do modo demonstração: nas caixas das ruas A a D da
// demonstração da Fase 2 (inclui os 5 do canvas). Nada aqui é dado real e
// nada é salvo.
import type { ItemPesquisa, Modalidade, Tipo } from "@/features/documentos/tipos";
import { ESTRUTURA_DEMO } from "./estrutura";
import { SECRETARIAS_DEMO } from "./dados";

export type DocumentoDemo = ItemPesquisa & {
  cnpj: string | null;
  vigencia_inicio: string | null;
  vigencia_fim: string | null;
  arquivo: { nome: string; paginas: number; tamanho: number } | null;
};

const SEC = Object.fromEntries(SECRETARIAS_DEMO.map((s) => [s.nome, s.id])) as Record<string, string>;
// Capacidade de documentos de cada caixa da demonstração (como no canvas: "de 20").
export const CAPACIDADE_CAIXA_DEMO = 20;
export const idDocumentoDemo = (n: number) => `de500000-0000-0000-0000-${String(n).padStart(12, "0")}`;

// Caixa da demonstração: mesma conta dos níveis (de3X...), prefixo de4.
export function idCaixaDemo(nivelId: string, numero: number) {
  const n = Number(nivelId.slice(-12));
  return `de400000-0000-0000-0000-${String(n * 100 + numero).padStart(12, "0")}`;
}
export function caixaDemo(id: string) {
  const bruto = Number(id.slice(-12));
  const numero = bruto % 100;
  const nivelNum = Math.floor(bruto / 100);
  const nivel = ESTRUTURA_DEMO.niveis.find((n) => Number(n.id.slice(-12)) === nivelNum);
  const modulo = ESTRUTURA_DEMO.modulos.find((m) => m.id === nivel?.moduloId);
  const rua = ESTRUTURA_DEMO.ruas.find((r) => r.id === modulo?.ruaId);
  if (!nivel || !modulo || !rua) return null;
  return { id, numero, nivel, modulo, rua };
}

type Linha = [Tipo, Modalidade | null, string, number, string, string, string | null, number | null, string, string, string, string];

// tipo, modalidade, número, ano, secretaria, objeto, empresa, valor, situação, posição, [vigência início, fim]
const CANVAS: Linha[] = [
  ["licitacao", "pregao_eletronico", "015/2023", 2023, "Saúde", "Aquisição de equipamentos hospitalares", "TecnoMed Fictícia Ltda.", 50000, "concluida", "B-M3-N3-C02", "", ""],
  ["licitacao", "pregao_eletronico", "009/2023", 2023, "Educação", "Material de expediente", "Papelaria Central Fictícia", 18400, "concluida", "B-M3-N3-C03", "", ""],
  ["contrato", null, "041/2022", 2022, "Educação", "Manutenção de ar-condicionado", "Frio Sul Fictícia Ltda.", 96000, "vigente", "C-M1-N2-C04", "2022-03-01", "2027-02-28"],
  ["licitacao", "tomada_de_precos", "003/2022", 2022, "Obras", "Reforma de escola municipal", "Construtora Alfa Fictícia", 412000, "concluida", "C-M2-N1-C01", "", ""],
  ["licitacao", "dispensa", "027/2021", 2021, "Administração", "Serviço de dedetização", "Higiene Total Fictícia", 7800, "concluida", "D-M5-N4-C04", "", ""],
];

// A caixa do canvas (B-M3-N3-C02) tem 14 documentos: o primeiro é o da linha
// acima e estes são os outros 13, de várias secretarias (o operador vê parte).
const CAIXA_DO_CANVAS: Linha[] = [
  ["licitacao", "pregao_eletronico", "016/2023", 2023, "Saúde", "Aquisição de materiais odontológicos", "OdontoVida Fictícia", 21800, "concluida", "B-M3-N3-C02", "", ""],
  ["licitacao", "dispensa", "021/2023", 2023, "Saúde", "Manutenção de equipamentos de imagem", "ImagemMed Fictícia", 9600, "concluida", "B-M3-N3-C02", "", ""],
  ["contrato", null, "012/2023", 2023, "Saúde", "Locação de ambulâncias", "Resgate Fictícia Ltda.", 188000, "vigente", "B-M3-N3-C02", "2023-02-01", "2028-01-31"],
  ["licitacao", "concorrencia", "004/2023", 2023, "Saúde", "Reforma do pronto atendimento", "Obra Certa Fictícia", 640000, "concluida", "B-M3-N3-C02", "", ""],
  ["licitacao", "pregao_eletronico", "030/2023", 2023, "Educação", "Aquisição de carteiras escolares", "Móveis Escolares Fictícia", 54000, "concluida", "B-M3-N3-C02", "", ""],
  ["licitacao", "pregao_eletronico", "031/2023", 2023, "Educação", "Fornecimento de livros didáticos", "Livraria Central Fictícia", 132000, "concluida", "B-M3-N3-C02", "", ""],
  ["contrato", null, "019/2023", 2023, "Educação", "Transporte escolar rural", "Via Escolar Fictícia", 310000, "vigente", "B-M3-N3-C02", "2023-02-15", "2026-12-31"],
  ["licitacao", "dispensa", "035/2023", 2023, "Educação", "Aquisição de material esportivo", null, 6400, "concluida", "B-M3-N3-C02", "", ""],
  ["licitacao", "concorrencia", "009/2023", 2023, "Educação", "Construção de creche", "Construtora Beta Fictícia", 1250000, "em_andamento", "B-M3-N3-C02", "", ""],
  ["licitacao", "tomada_de_precos", "007/2023", 2023, "Obras", "Pavimentação da avenida central", "Asfalto Sul Fictícia", 480000, "concluida", "B-M3-N3-C02", "", ""],
  ["contrato", null, "022/2023", 2023, "Obras", "Manutenção de praças", "Jardim Vivo Fictícia", 72000, "vigente", "B-M3-N3-C02", "2023-04-01", "2027-03-31"],
  ["licitacao", "pregao_eletronico", "040/2023", 2023, "Administração", "Aquisição de papel e toner", "Papelaria Central Fictícia", 15600, "concluida", "B-M3-N3-C02", "", ""],
  ["licitacao", "dispensa", "041/2023", 2023, "Administração", "Serviço de chaveiro", null, 2300, "concluida", "B-M3-N3-C02", "", ""],
];

const OBJETOS = [
  "Aquisição de medicamentos", "Pavimentação de vias urbanas", "Fornecimento de merenda escolar", "Locação de veículos",
  "Serviço de limpeza urbana", "Aquisição de computadores", "Reforma de unidade de saúde", "Manutenção de iluminação pública",
  "Transporte escolar", "Aquisição de uniformes", "Construção de quadra poliesportiva", "Serviço de vigilância",
];
const EMPRESAS = ["Alfa Fictícia Ltda.", "Beta Serviços Fictícios", "Gama Comércio Fictício", "Delta Engenharia Fictícia", "Ômega Fictícia S/A"];
const MODALIDADES: Modalidade[] = ["pregao_eletronico", "pregao_presencial", "concorrencia", "dispensa", "tomada_de_precos", "convite"];
const SECRETARIAS = ["Saúde", "Educação", "Obras", "Administração"];

function posicao(i: number) {
  return `${"ABCD"[i % 4]}-M${1 + ((i * 7) % 5)}-N${1 + ((i * 3) % 4)}-C${String(1 + (i % 3)).padStart(2, "0")}`;
}

function montar(): DocumentoDemo[] {
  const linhas: Linha[] = [...CANVAS, ...CAIXA_DO_CANVAS];
  for (let i = 0; i < 35; i++) {
    const contrato = i % 4 === 3;
    const ano = 2012 + ((i * 5) % 14);
    linhas.push([
      contrato ? "contrato" : "licitacao",
      contrato ? null : MODALIDADES[i % MODALIDADES.length],
      `${String(10 + i).padStart(3, "0")}/${ano}`,
      ano,
      SECRETARIAS[i % SECRETARIAS.length],
      OBJETOS[i % OBJETOS.length],
      i % 7 === 6 ? null : EMPRESAS[i % EMPRESAS.length],
      contrato || i % 2 ? 12000 + i * 9300 : null,
      contrato ? ["vigente", "encerrado", "rescindido"][i % 3] : ["concluida", "em_andamento", "deserta", "fracassada"][i % 4],
      posicao(i),
      contrato ? `${ano}-02-01` : "",
      contrato ? `${ano + 1 + (i % 3)}-01-31` : "",
    ]);
  }
  return linhas.map((l, i) => {
    const [tipo, modalidade, numero, ano, sec, objeto, empresa, valor, situacao, codigo, vi, vf] = l;
    const [rua, m, n, c] = codigo.split("-");
    const caixaN = Number(c.slice(1));
    const nivel = ESTRUTURA_DEMO.niveis.find(
      (x) =>
        x.numero === Number(n.slice(1)) &&
        ESTRUTURA_DEMO.modulos.find((mm) => mm.id === x.moduloId)?.numero === Number(m.slice(1)) &&
        ESTRUTURA_DEMO.ruas.find((r) => r.id === ESTRUTURA_DEMO.modulos.find((mm) => mm.id === x.moduloId)?.ruaId)?.codigo === rua,
    )!;
    const dia = new Date(Date.UTC(2026, 10, 14) - i * 36 * 3600 * 1000).toISOString();
    return {
      id: idDocumentoDemo(i + 1),
      tipo,
      modalidade,
      numero,
      ano,
      situacao,
      objeto,
      empresa,
      valor,
      secretaria_id: SEC[sec],
      criado_em: dia,
      conferido: i % 3 !== 2,
      codigo,
      tem_pdf: i % 5 !== 4,
      cnpj: empresa ? "11222333000181" : null,
      vigencia_inicio: vi || null,
      vigencia_fim: vf || null,
      arquivo: i % 5 !== 4 ? { nome: `${tipo}-${numero.replace("/", "-")}.pdf`, paginas: 3, tamanho: 2_400_000 } : null,
      // posição como no banco: a caixa ao lado do código
      caixa_id: idCaixaDemo(nivel.id, caixaN),
    } as DocumentoDemo & { caixa_id: string };
  });
}

export const DOCUMENTOS_DEMO = montar() as (DocumentoDemo & { caixa_id: string })[];
