import "server-only";
import { createHash } from "node:crypto";
import { clienteSessao } from "@/lib/supabase/servidor";
import { LIMITE_PDFS_BYTES, montarPacote, type PdfPacote, type TabelaCsv } from "./pacote";

// Leitura pela sessão do administrador: o RLS limita à prefeitura dele.
const TABELAS = ["secretarias", "galpoes", "ruas", "modulos", "niveis", "caixas", "documentos", "arquivos", "emprestimos", "auditoria"] as const;
const PAGINA = 1000;
const TETO_LINHAS = 200_000;

const texto = (v: unknown) => (v === null || v === undefined ? "" : typeof v === "object" ? JSON.stringify(v) : String(v));

export async function gerarExportacao() {
  const sb = await clienteSessao();
  if (!sb) throw new Error("indisponível");
  const tabelas: TabelaCsv[] = [];
  let documentos = 0;
  let arquivos: { id: string; documento_id: string; caminho: string; tamanho: number }[] = [];
  for (const nome of TABELAS) {
    const linhas: Record<string, unknown>[] = [];
    for (let de = 0; linhas.length < TETO_LINHAS; de += PAGINA) {
      const { data, error } = await sb.from(nome).select("*").order("id").range(de, de + PAGINA - 1);
      if (error) throw new Error("falha na leitura");
      linhas.push(...((data ?? []) as Record<string, unknown>[]));
      if ((data?.length ?? 0) < PAGINA) break;
    }
    const cabecalhos = linhas[0] ? Object.keys(linhas[0]) : [];
    tabelas.push({ nome, cabecalhos, linhas: linhas.map((l) => cabecalhos.map((c) => texto(l[c]))) });
    if (nome === "documentos") documentos = linhas.length;
    if (nome === "arquivos") {
      arquivos = linhas.filter((l) => l.ativo === true && typeof l.caminho === "string" && l.caminho) as never;
    }
  }
  const pdfs: PdfPacote[] = [];
  const fora: string[][] = [];
  let total = 0;
  for (const a of arquivos) {
    if (total + Number(a.tamanho) > LIMITE_PDFS_BYTES) {
      fora.push([a.documento_id, "acima do limite do pacote"]);
      continue;
    }
    const { data, error } = await sb.storage.from("acervo").download(a.caminho);
    if (error || !data) {
      fora.push([a.documento_id, "não foi possível ler"]);
      continue;
    }
    const bytes = new Uint8Array(await data.arrayBuffer());
    total += bytes.length;
    pdfs.push({ caminho: `${a.id}.pdf`, bytes, sha256: createHash("sha256").update(bytes).digest("hex") });
  }
  return { zip: montarPacote(tabelas, pdfs, fora), documentos, pdfs: pdfs.length, fora: fora.length };
}
