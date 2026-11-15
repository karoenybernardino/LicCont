import "server-only";
import { createHash } from "node:crypto";
import { clienteSessao } from "@/lib/supabase/servidor";
import { LIMITE_PDFS_BYTES, LIMITE_VOLUME_BYTES, montarVolumes, type PdfPacote, type TabelaCsv } from "./pacote";

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
  const avisos: string[] = [];
  for (const nome of TABELAS) {
    const linhas: Record<string, unknown>[] = [];
    for (let de = 0; ; de += PAGINA) {
      if (linhas.length >= TETO_LINHAS) {
        avisos.push(`A planilha ${nome}.csv foi cortada em ${TETO_LINHAS} linhas: há mais registros no sistema. Peça uma exportação em partes.`);
        break;
      }
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
    const previsto = Number(a.tamanho);
    if (previsto > LIMITE_VOLUME_BYTES || total + previsto > LIMITE_PDFS_BYTES) {
      fora.push([a.documento_id, "acima do limite do pacote"]);
      continue;
    }
    const { data, error } = await sb.storage.from("acervo").download(a.caminho);
    if (error || !data) {
      fora.push([a.documento_id, "não foi possível ler"]);
      continue;
    }
    const bytes = new Uint8Array(await data.arrayBuffer());
    // O tamanho do banco pode não bater com o objeto: vale o que foi baixado.
    if (bytes.length > LIMITE_VOLUME_BYTES || total + bytes.length > LIMITE_PDFS_BYTES) {
      fora.push([a.documento_id, "acima do limite do pacote"]);
      continue;
    }
    total += bytes.length;
    pdfs.push({ caminho: `${a.id}.pdf`, bytes, sha256: createHash("sha256").update(bytes).digest("hex") });
  }
  return { volumes: montarVolumes(tabelas, pdfs, fora, avisos), documentos, pdfs: pdfs.length, fora: fora.length };
}
