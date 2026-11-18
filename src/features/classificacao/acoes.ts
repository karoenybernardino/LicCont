"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { clienteSessao } from "@/lib/supabase/servidor";
import { exigirAdmin } from "@/features/sessao/dal";
import { MENSAGEM_INDISPONIVEL } from "@/features/login/esquemas";
import { AVISO_DEMO, emDemo } from "@/features/demo/dados";

// Grupos documentais e tipologias do órgão: só o administrador mexe (o RLS exige de novo).
// Nada é apagado: grupo e tipologia só se desativam, para não soltar documento já classificado.
export type RetornoGrupos = { erro?: string; aviso?: string };

const uuid = z.guid();
const nome = z.string().trim().min(2, "Informe o nome (de 2 a 80 letras).").max(80, "Nome muito longo (até 80).");
const PAPEIS = ["coordenador", "operador", "consulta"] as const;

function mensagem(codigo: string | undefined) {
  if (codigo === "23505") return "Já existe um item com este nome.";
  if (codigo === "42501") return "Você não tem permissão para esta ação.";
  return "Não foi possível salvar. Tente de novo.";
}

type Cliente = NonNullable<Awaited<ReturnType<typeof clienteSessao>>>;

async function gravar(chamada: (sb: Cliente, prefeitura: string) => PromiseLike<{ error: { code?: string } | null }>, aviso: string): Promise<RetornoGrupos> {
  const { usuario } = await exigirAdmin();
  if (emDemo()) return { aviso: AVISO_DEMO };
  const sb = await clienteSessao();
  if (!sb) return { erro: MENSAGEM_INDISPONIVEL };
  const { error } = await chamada(sb, usuario.prefeituraId);
  if (error) return { erro: mensagem(error.code) };
  revalidatePath("/configuracoes/grupos");
  revalidatePath("/documentos", "layout");
  return { aviso };
}

export async function criarGrupo(entrada: unknown): Promise<RetornoGrupos> {
  const d = z.object({ nome, restrito: z.boolean() }).safeParse(entrada);
  if (!d.success) return { erro: d.error.issues[0].message };
  return gravar((sb, p) => sb.from("grupos_documentais").insert({ prefeitura_id: p, nome: d.data.nome, restrito: d.data.restrito }), "Grupo criado.");
}

export async function atualizarGrupo(entrada: unknown): Promise<RetornoGrupos> {
  const d = z.object({ id: uuid, restrito: z.boolean().optional(), ativo: z.boolean().optional(), nome: nome.optional() }).safeParse(entrada);
  if (!d.success) return { erro: d.error.issues[0].message };
  const { id, ...campos } = d.data;
  return gravar((sb) => sb.from("grupos_documentais").update(campos).eq("id", id), "Grupo atualizado.");
}

export async function definirPapeis(entrada: unknown): Promise<RetornoGrupos> {
  const d = z.object({ grupo: uuid, papeis: z.array(z.enum(PAPEIS)).max(3) }).safeParse(entrada);
  if (!d.success) return { erro: "Não foi possível salvar. Tente de novo." };
  return gravar((sb) => sb.rpc("grupo_definir_papeis", { p_grupo: d.data.grupo, p_papeis: d.data.papeis }), "Quem vê o grupo foi atualizado.");
}

export async function criarTipologia(entrada: unknown): Promise<RetornoGrupos> {
  const d = z.object({ grupo: uuid, nome }).safeParse(entrada);
  if (!d.success) return { erro: d.error.issues[0].message };
  return gravar((sb, p) => sb.from("tipologias").insert({ prefeitura_id: p, grupo_id: d.data.grupo, nome: d.data.nome }), "Tipologia criada.");
}

export async function alterarTipologia(entrada: unknown): Promise<RetornoGrupos> {
  const d = z.object({ id: uuid, ativa: z.boolean() }).safeParse(entrada);
  if (!d.success) return { erro: "Não foi possível salvar. Tente de novo." };
  return gravar((sb) => sb.from("tipologias").update({ ativa: d.data.ativa }).eq("id", d.data.id), d.data.ativa ? "Tipologia reativada." : "Tipologia desativada.");
}
