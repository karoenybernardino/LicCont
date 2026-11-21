import type { CaixaEtiqueta } from "./dados";
import type { Orgao, Tipo } from "@/features/documentos/tipos";
import { MODALIDADES } from "@/features/documentos/tipos";
import { prazoDeGuarda } from "@/features/temporalidade/classes-tabela";
import type { Regra } from "@/features/temporalidade/regras";

// Monta a etiqueta da caixa a partir do que está no cadastro de documento (a prévia do formulário).
// Sem caixa escolhida, mostra "0000" e "–" em vez de quebrar.
export function caixaDoFormulario(p: {
  orgao: Orgao | "";
  sequencial?: number;
  localizacao: string | null;
  tipo: Tipo;
  modalidade: string;
  numero: string;
  ano: string;
  secretaria: string;
  objeto: string;
  regra?: Regra;
}): CaixaEtiqueta {
  const ano = p.ano.trim();
  const nome = p.tipo === "licitacao" ? "LICITAÇÃO" : p.tipo === "contrato" ? "CONTRATO" : (p.regra?.grupo ?? "DOCUMENTOS").toUpperCase();
  const numero = p.numero.trim();
  const modalidade = p.tipo === "contrato" ? "Contrato" : p.tipo === "outro" ? "Documento" : p.modalidade in MODALIDADES ? MODALIDADES[p.modalidade as keyof typeof MODALIDADES] : "Licitação";
  return {
    id: "previa", sequencial: p.sequencial ?? 0, numero: String(p.sequencial ?? 0).padStart(4, "0"), localizacao: p.localizacao ?? "–",
    titulo: `${nome} – ${ano || "–"}`,
    classeId: p.regra?.id ?? null, classe: p.regra?.classe ?? "Sem classe", tipologia: null, codigo: p.regra?.codigo ?? "—",
    prazo: p.regra ? prazoDeGuarda(p.regra) : "Sem classe na tabela de temporalidade", volume: null,
    itens: [{ modalidade, numeroAno: !numero ? "–" : numero.includes("/") ? numero : `${numero}/${ano}`, secretaria: p.secretaria, objeto: p.objeto, volume: 1 }],
    secretariaIds: [], anos: [], impressa: null,
    orgao: p.orgao === "camara" ? "camara" : "prefeitura", tipo: "detalhada", etiquetaGeral: false, fundo: null, setor: null, meses: [], anoLimite: null, digitalizada: false, observacao: null,
  };
}
