import "server-only";
import { clienteSessao } from "@/lib/supabase/servidor";
import { emDemo } from "@/features/demo/dados";
import { CLASSES_DEMO, GRUPOS_DEMO } from "@/features/demo/classificacao";
import type { Regra, TipoPrazo, Destinacao } from "@/features/temporalidade/regras";

// Marca (logo, nome na etiqueta, parceira) e classes de um órgão, lidas pela equipe LicCONT.
// A equipe não lê o acervo: aqui só entram cadastro do órgão e tabela de temporalidade.

export type Parceira = { id: string; nome: string; cnpj: string; logoUrl: string | null; ativa: boolean; prefeituras: number };
export type MarcaOrgao = { tipo: "prefeitura" | "camara"; nomeEtiqueta: string; logoUrl: string | null; parceiraId: string | null };

const PARCEIRAS_DEMO: Parceira[] = [
  { id: "de830000-0000-0000-0000-000000000001", nome: "Empresa Parceira Exemplo", cnpj: "00000000000100", logoUrl: null, ativa: true, prefeituras: 2 },
  { id: "de830000-0000-0000-0000-000000000002", nome: "Digitaliza Exemplo ME", cnpj: "11111111000111", logoUrl: null, ativa: true, prefeituras: 1 },
  { id: "de830000-0000-0000-0000-000000000003", nome: "Arquivo Exemplo Ltda", cnpj: "22222222000122", logoUrl: null, ativa: true, prefeituras: 0 },
];

async function urlAssinada(caminho: string | null): Promise<string | null> {
  if (!caminho) return null;
  const sb = await clienteSessao();
  const r = await sb?.storage.from("marcas").createSignedUrl(caminho, 300);
  return r?.data?.signedUrl ?? null;
}

export async function listarParceiras(): Promise<Parceira[]> {
  if (emDemo()) return PARCEIRAS_DEMO;
  const sb = await clienteSessao();
  if (!sb) return [];
  const { data } = await sb.rpc("equipe_parceiras");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const linhas = (data ?? []) as any[];
  return Promise.all(linhas.map(async (p) => ({ id: p.id, nome: p.nome, cnpj: p.cnpj, ativa: p.ativa, prefeituras: Number(p.prefeituras), logoUrl: await urlAssinada(p.logo_caminho) })));
}

export type OrgaoDaParceira = { id: string; nome: string; cnpj: string; tipo: string; ligada: boolean; deOutra: boolean };
export async function orgaosParaParceira(parceira: string): Promise<OrgaoDaParceira[]> {
  if (emDemo()) {
    return [
      { id: "de000000-0000-0000-0000-000000000001", nome: "Prefeitura Fictícia de Exemplo", cnpj: "00000000000809", tipo: "prefeitura", ligada: parceira === PARCEIRAS_DEMO[0].id, deOutra: false },
      { id: "de000000-0000-0000-0000-000000000003", nome: "Câmara Fictícia (em implantação)", cnpj: "00000000000555", tipo: "camara", ligada: false, deOutra: false },
    ];
  }
  const sb = await clienteSessao();
  if (!sb) return [];
  const { data } = await sb.rpc("equipe_parceira_orgaos", { p_parceira: parceira });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map((o) => ({ id: o.id, nome: o.nome, cnpj: o.cnpj, tipo: o.tipo, ligada: !!o.ligada, deOutra: !!o.de_outra }));
}

export async function marcaDoOrgao(id: string): Promise<MarcaOrgao | null> {
  if (emDemo()) return { tipo: "prefeitura", nomeEtiqueta: "Prefeitura Fictícia de Exemplo", logoUrl: null, parceiraId: PARCEIRAS_DEMO[0].id };
  const sb = await clienteSessao();
  if (!sb) return null;
  const { data } = await sb.from("prefeituras").select("tipo, nome_etiqueta, logo_caminho, parceira_id").eq("id", id).maybeSingle();
  if (!data) return null;
  return { tipo: data.tipo as MarcaOrgao["tipo"], nomeEtiqueta: (data.nome_etiqueta as string | null) ?? "", logoUrl: await urlAssinada(data.logo_caminho as string | null), parceiraId: (data.parceira_id as string | null) ?? null };
}

export async function classesDoOrgao(id: string): Promise<{ classes: Regra[]; grupos: { id: string; nome: string }[] }> {
  if (emDemo()) return { classes: CLASSES_DEMO, grupos: GRUPOS_DEMO.map((g) => ({ id: g.id, nome: g.nome })) };
  const sb = await clienteSessao();
  if (!sb) return { classes: [], grupos: [] };
  const [c, g] = await Promise.all([sb.rpc("equipe_classes", { p_prefeitura: id }), sb.rpc("equipe_grupos", { p_prefeitura: id })]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const classes = ((c.data ?? []) as any[]).map((r): Regra => ({
    id: r.id, codigo: r.codigo, classe: r.nome, grupoId: r.grupo_id, grupo: r.grupo, corrente: r.prazo_corrente_anos, intermediaria: r.prazo_intermediaria_anos,
    tipoPrazo: r.tipo_prazo as TipoPrazo, evento: r.evento, destinacao: r.destinacao as Destinacao, observacao: r.observacao, ativa: r.ativa,
  }));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const grupos = ((g.data ?? []) as any[]).filter((x) => x.ativo).map((x) => ({ id: x.id as string, nome: x.nome as string }));
  return { classes, grupos };
}
