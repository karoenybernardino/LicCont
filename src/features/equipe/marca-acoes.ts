"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { clienteSessao } from "@/lib/supabase/servidor";
import { exigirEquipe } from "@/features/sessao/dal";
import { emDemo } from "@/features/demo/dados";
import { cnpjValido } from "@/features/documentos/esquemas";

// Marca do órgão e empresas parceiras: só a equipe LicCONT. O logo chega já em PNG (o navegador converte
// o SVG), com até 1 MB; aqui conferimos o tamanho e os bytes de PNG. O banco e o Storage conferem de novo.
const PNG = [0x89, 0x50, 0x4e, 0x47];
const LIMITE = 1024 * 1024;

async function lerLogo(f: FormDataEntryValue | null): Promise<Uint8Array | null | "invalido"> {
  if (!(f instanceof File) || f.size === 0) return null;
  if (f.size > LIMITE) return "invalido";
  const b = new Uint8Array(await f.arrayBuffer());
  return PNG.every((x, i) => b[i] === x) ? b : "invalido";
}

type Sb = NonNullable<Awaited<ReturnType<typeof clienteSessao>>>;
async function enviarLogo(sb: Sb, caminho: string, bytes: Uint8Array) {
  const r = await sb.storage.from("marcas").upload(caminho, bytes, { contentType: "image/png", upsert: true });
  return !r.error;
}

const uuid = z.guid();

export async function salvarMarcaOrgao(formData: FormData): Promise<void> {
  await exigirEquipe();
  const dados = z
    .object({
      id: uuid,
      tipo: z.enum(["prefeitura", "camara"]),
      nome_etiqueta: z.string().trim().max(120),
      parceira: z.union([uuid, z.literal("")]),
    })
    .safeParse(Object.fromEntries(formData));
  const volta = (r: string, id?: string) => redirect(`/equipe/${id ?? ""}?aba=marca&marca=${r}`);
  if (!dados.success) return volta("erro");
  const d = dados.data;
  if (emDemo()) return volta("demo", d.id);
  if (d.nome_etiqueta && d.nome_etiqueta.length < 2) return volta("erro", d.id);
  const logo = await lerLogo(formData.get("logo"));
  if (logo === "invalido") return volta("logo", d.id);
  const sb = await clienteSessao();
  if (!sb) return volta("erro", d.id);
  const caminho = `orgaos/${d.id}/logo.png`;
  if (logo && !(await enviarLogo(sb, caminho, logo))) return volta("logo", d.id);
  const { error } = await sb.rpc("equipe_orgao_marca", {
    p_prefeitura: d.id, p_tipo: d.tipo, p_nome_etiqueta: d.nome_etiqueta, p_logo: logo ? caminho : null,
    p_remover_logo: formData.get("remover_logo") === "on" && !logo, p_parceira: d.parceira || null,
  });
  revalidatePath("/equipe", "layout");
  return volta(error ? "erro" : "ok", d.id);
}

export async function salvarParceira(formData: FormData): Promise<void> {
  await exigirEquipe();
  const bruto = Object.fromEntries(formData);
  const dados = z
    .object({
      id: z.union([uuid, z.literal("")]),
      nome: z.string().trim().min(2).max(120),
      cnpj: z.string().transform((v) => v.replace(/\D/g, "")).refine(cnpjValido),
    })
    .safeParse(bruto);
  const base = "/equipe/prefeituras/parceiras";
  if (!dados.success) return redirect(`${base}?erro=dados${typeof bruto.id === "string" && uuid.safeParse(bruto.id).success ? `&sel=${bruto.id}` : "&nova=1"}`);
  if (emDemo()) return redirect(`${base}?erro=demo`);
  const id = dados.data.id || crypto.randomUUID();
  const orgaos = formData.getAll("orgaos").map(String).filter((o) => uuid.safeParse(o).success);
  const logo = await lerLogo(formData.get("logo"));
  if (logo === "invalido") return redirect(`${base}?erro=logo&sel=${id}`);
  const sb = await clienteSessao();
  if (!sb) return redirect(`${base}?erro=dados`);
  const caminho = `parceiras/${id}/logo.png`;
  if (logo && !(await enviarLogo(sb, caminho, logo))) return redirect(`${base}?erro=logo&sel=${id}`);
  const { error } = await sb.rpc("equipe_parceira_salvar", { p_id: id, p_nome: dados.data.nome, p_cnpj: dados.data.cnpj, p_logo: logo ? caminho : null, p_prefeituras: orgaos });
  revalidatePath("/equipe", "layout");
  return redirect(`${base}?${error ? (error.code === "23505" ? "erro=cnpj" : "erro=dados") : "ok=1"}&sel=${id}`);
}
