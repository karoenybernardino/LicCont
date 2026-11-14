// Formatação pt-BR dos números da tela.

export function formatarTamanho(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}

export function descreverArquivo(nome: string, paginas: number | null, bytes: number) {
  const pags = paginas ? `${paginas} ${paginas === 1 ? "página" : "páginas"}` : null;
  return [nome, pags, formatarTamanho(bytes)].filter(Boolean).join(" · ");
}

export function formatarValor(valor: number | null) {
  return valor === null ? "—" : valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatarData(iso: string | null) {
  if (!iso) return "—";
  const [a, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
}

// "1.234,56" ou "1234.56" -> 1234.56; vazio -> null; inválido -> NaN.
export function lerValor(texto: string) {
  const t = texto.replace(/R\$|\s/g, "");
  if (!t) return null;
  const n = /,/.test(t) ? Number(t.replace(/\./g, "").replace(",", ".")) : Number(t);
  return Number.isFinite(n) ? n : NaN;
}
