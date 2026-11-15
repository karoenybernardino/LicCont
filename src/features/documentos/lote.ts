// Envio de vários PDFs de uma vez: sugere o documento de cada arquivo pelo
// número e ano que aparecem no nome ("contrato-019-2015.pdf" → 019/2015). É só
// sugestão: a pessoa confere cada linha antes de enviar. Roda no navegador.
export type DocumentoSemPdf = { id: string; titulo: string; numero: string; ano: number };

const semZeros = (n: string) => n.replace(/^0+(?=\d)/, "");

// Pares "número + ano" no nome do arquivo (ano de 4 dígitos).
export function numerosDoNome(nome: string): { numero: string; ano: number }[] {
  const base = nome.replace(/\.pdf$/i, "");
  const saida: { numero: string; ano: number }[] = [];
  for (const m of base.matchAll(/(?<!\d)(\d{1,6})\s*[-_./\ ]\s*((?:19|20)\d{2})(?!\d)/g)) saida.push({ numero: semZeros(m[1]), ano: Number(m[2]) });
  return saida;
}

// Devolve o id do documento só se houver exatamente um candidato (sem adivinhar).
export function sugerirDocumento(nome: string, docs: DocumentoSemPdf[], jaUsados: Set<string> = new Set()): string | null {
  const pares = numerosDoNome(nome);
  if (pares.length === 0) return null;
  const achados = docs.filter((d) => !jaUsados.has(d.id) && pares.some((p) => semZeros(d.numero.split("/")[0].replace(/\D/g, "")) === p.numero && d.ano === p.ano));
  return achados.length === 1 ? achados[0].id : null;
}
