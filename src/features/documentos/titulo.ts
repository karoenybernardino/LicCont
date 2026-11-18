import { MODALIDADES, TIPOS, type Modalidade, type Tipo } from "./tipos";

// "Pregão Eletrônico 015/2023": modalidade (ou "Contrato") + número do
// processo. Se o número já traz a barra ("015/2023"), não repete o ano.
// Documento de outro grupo usa o nome da tipologia (ou "Documento").
export function tituloDocumento(d: { tipo: Tipo; modalidade: Modalidade | null; numero: string; ano: number; tipologia?: string | null }) {
  const nome = d.tipo === "contrato" ? TIPOS.contrato : d.tipo === "outro" ? d.tipologia || TIPOS.outro : d.modalidade ? MODALIDADES[d.modalidade] : TIPOS.licitacao;
  const numero = d.numero.includes("/") ? d.numero : `${d.numero}/${d.ano}`;
  return `${nome} ${numero}`;
}
