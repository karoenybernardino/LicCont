import { esquemaDocumento } from "@/features/documentos/esquemas";
import { MODALIDADE_POR_TEXTO, SITUACAO_POR_TEXTO, TIPO_POR_TEXTO, CAMPOS, semAcento, type ChaveCampo, type Mapa } from "./colunas";

// Valida cada linha da planilha com o mesmo esquema do cadastro manual.
// Os erros dizem só a linha, o campo e um motivo fixo: nunca o conteúdo da
// célula (pode ter nome de empresa ou de pessoa).

export type Secretaria = { id: string; nome: string };
export type ErroLinha = { linha: number; campo: string; motivo: string };
export type DadosImportacao = {
  secretaria_id: string;
  tipo: "licitacao" | "contrato";
  modalidade: string | null;
  numero: string;
  ano: number;
  objeto: string;
  empresa: string | null;
  cnpj: string | null;
  cpf_credor: string | null;
  valor: number | null;
  situacao: string;
  vigencia_inicio: string | null;
  vigencia_fim: string | null;
};
export type LinhaValida = { linha: number; dados: DadosImportacao; chave: string };
export type LinhaRepetida = { linha: number; motivo: "arquivo" | "sistema" };
export type Conferencia = {
  total: number;
  validas: LinhaValida[];
  erros: ErroLinha[];
  repetidas: LinhaRepetida[];
};

// Quem entra na unicidade do banco: tipo, modalidade, número e ano.
export const chaveProcesso = (d: { tipo: string; modalidade: string | null; numero: string; ano: number }) =>
  `${d.tipo}|${d.modalidade ?? ""}|${d.numero}|${d.ano}`;

const CAIXA_FALSA = "00000000-0000-0000-0000-000000000000";

// dd/mm/aaaa, d/m/aa e aaaa-mm-dd viram aaaa-mm-dd. Outra coisa: inválida.
export function lerData(t: string): string | null | undefined {
  const s = t.trim();
  if (!s) return null;
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  let a: number, mes: number, d: number;
  if (m) [a, mes, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  else {
    m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
    if (!m) return undefined;
    d = Number(m[1]);
    mes = Number(m[2]);
    a = Number(m[3]);
    if (m[3].length === 2) a += a > 50 ? 1900 : 2000;
  }
  const dt = new Date(Date.UTC(a, mes - 1, d));
  if (dt.getUTCFullYear() !== a || dt.getUTCMonth() !== mes - 1 || dt.getUTCDate() !== d) return undefined;
  return `${String(a).padStart(4, "0")}-${String(mes).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

const ROTULO = Object.fromEntries(CAMPOS.map((c) => [c.chave, c.rotulo])) as Record<ChaveCampo, string>;
const CAMPO_FORM: Record<string, ChaveCampo> = { secretaria: "secretaria", caixa: "secretaria" };

export function validarLinhas(
  linhas: string[][],
  mapa: Mapa,
  secretarias: Secretaria[],
  existentes: ReadonlySet<string>,
  padrao?: Secretaria,
): Conferencia {
  const porNome = new Map(secretarias.map((s) => [semAcento(s.nome), s.id]));
  const validas: LinhaValida[] = [];
  const erros: ErroLinha[] = [];
  const repetidas: LinhaRepetida[] = [];
  const vistas = new Set<string>();

  linhas.forEach((celulas, i) => {
    // Linha 1 da planilha é o título; os dados começam na 2.
    const linha = i + 2;
    const pega = (k: ChaveCampo) => (mapa[k] === undefined ? "" : (celulas[mapa[k]!] ?? "").trim());
    const falhas: ErroLinha[] = [];
    const erro = (campo: ChaveCampo, motivo: string) => falhas.push({ linha, campo: ROTULO[campo], motivo });

    const tipo = TIPO_POR_TEXTO[semAcento(pega("tipo"))];
    if (!tipo) erro("tipo", "Use Licitação ou Contrato.");
    const secretariaId = mapa.secretaria === undefined ? padrao?.id : porNome.get(semAcento(pega("secretaria")));
    if (!secretariaId) erro("secretaria", "Secretaria não cadastrada.");

    const modTexto = pega("modalidade");
    const modalidade = modTexto ? (MODALIDADE_POR_TEXTO[semAcento(modTexto)] ?? "") : null;
    if (modalidade === "") erro("modalidade", "Modalidade desconhecida.");

    const sitTexto = semAcento(pega("situacao"));
    const situacao = SITUACAO_POR_TEXTO[sitTexto];
    if (!situacao) erro("situacao", "Situação desconhecida.");

    const ini = lerData(pega("vigencia_inicio"));
    const fim = lerData(pega("vigencia_fim"));
    if (ini === undefined) erro("vigencia_inicio", "Data inválida. Use dd/mm/aaaa.");
    if (fim === undefined) erro("vigencia_fim", "Data inválida. Use dd/mm/aaaa.");

    if (falhas.length) {
      erros.push(...falhas);
      return;
    }

    const r = esquemaDocumento.safeParse({
      tipo,
      modalidade: modalidade || "",
      numero: pega("numero"),
      ano: pega("ano"),
      objeto: pega("objeto"),
      empresa: pega("empresa"),
      cnpj: pega("cnpj"),
      valor: pega("valor"),
      secretaria: secretariaId,
      caixa: CAIXA_FALSA,
      situacao,
      vigencia_inicio: ini ?? "",
      vigencia_fim: fim ?? "",
      encerrado_em: "",
    });
    if (!r.success) {
      for (const p of r.error.issues) {
        const campo = CAMPO_FORM[String(p.path[0])] ?? (String(p.path[0]) as ChaveCampo);
        erros.push({ linha, campo: ROTULO[campo] ?? String(p.path[0]), motivo: p.message });
      }
      return;
    }
    const d = r.data;
    const dados: DadosImportacao = {
      secretaria_id: d.secretaria,
      tipo: d.tipo,
      modalidade: d.modalidade,
      numero: d.numero,
      ano: d.ano,
      objeto: d.objeto,
      empresa: d.empresa,
      cnpj: d.cnpj,
      cpf_credor: d.cpf_credor,
      valor: d.valor,
      situacao: d.situacao,
      vigencia_inicio: d.vigencia_inicio,
      vigencia_fim: d.vigencia_fim,
    };
    const chave = chaveProcesso(dados);
    if (vistas.has(chave)) return void repetidas.push({ linha, motivo: "arquivo" });
    vistas.add(chave);
    if (existentes.has(chave)) return void repetidas.push({ linha, motivo: "sistema" });
    validas.push({ linha, dados, chave });
  });

  return { total: linhas.length, validas, erros, repetidas };
}

// Relatório de erros em CSV (tarefa 9.4): linha, campo e motivo, sem conteúdo.
export function errosParaLinhasCsv(erros: ErroLinha[]): string[][] {
  return [["Linha", "Campo", "Motivo"], ...erros.map((e) => [String(e.linha), e.campo, e.motivo])];
}
