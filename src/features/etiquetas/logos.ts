import "server-only";
import { clienteSessao } from "@/lib/supabase/servidor";
import { emDemo } from "@/features/demo/dados";
import type { LogosPrevia } from "./previa-caixa";

// Brasões da prévia da etiqueta: links assinados de 5 minutos, gerados no servidor com a sessão da
// pessoa. A política do bucket "marcas" só deixa ler orgaos/<prefeitura_atual>/..., e prefeitura_atual
// já vale para a empresa parceira (contexto). Nenhuma chave vai ao navegador. Demonstração: sem logo.
export async function logosDaPrevia(): Promise<LogosPrevia> {
  if (emDemo()) return {};
  const sb = await clienteSessao();
  if (!sb) return {};
  const { data } = await sb.rpc("etiqueta_marca");
  const m = ((data ?? []) as { logo_caminho: string | null; logo_camara_caminho?: string | null; parceira_logo_caminho?: string | null }[])[0];
  if (!m) return {};
  const assinar = async (caminho: string | null | undefined) => (caminho ? ((await sb.storage.from("marcas").createSignedUrl(caminho, 300)).data?.signedUrl ?? null) : null);
  const [prefeitura, camara, parceira] = await Promise.all([assinar(m.logo_caminho), assinar(m.logo_camara_caminho), assinar(m.parceira_logo_caminho)]);
  return { prefeitura, camara, parceira };
}
