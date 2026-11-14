import { MODALIDADES, TIPOS, type Modalidade, type Tipo } from "./tipos";

// "Pregão Eletrônico 015/2023": modalidade (ou "Contrato") + número do
// processo. Se o número já traz a barra ("015/2023"), não repete o ano.
export function tituloDocumento(d: { tipo: Tipo; modalidade: Modalidade | null; numero: string; ano: number }) {
  const nome = d.tipo === "contrato" ? TIPOS.contrato : d.modalidade ? MODALIDADES[d.modalidade] : TIPOS.licitacao;
  const numero = d.numero.includes("/") ? d.numero : `${d.numero}/${d.ano}`;
  return `${nome} ${numero}`;
}
