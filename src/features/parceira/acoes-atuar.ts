"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { idSchema } from "@/features/login/esquemas";
import { opcoesCookie } from "@/features/sessao/cookies";
import { exigirParceira, prefeiturasDaEmpresa } from "./dados";
import { COOKIE_PARCEIRA_PREF } from "./escolha";

// Seletor do topo: a pessoa da empresa passa a atuar em outra prefeitura. O id é conferido contra as
// permitidas (banco); o contexto do banco (parceira_atuar) é regravado na requisição seguinte.
export async function trocarPrefeitura(id: string): Promise<void> {
  await exigirParceira();
  const valido = idSchema.safeParse(id);
  if (!valido.success) return;
  if (!(await prefeiturasDaEmpresa()).some((p) => p.id === valido.data)) return;
  (await cookies()).set(COOKIE_PARCEIRA_PREF, valido.data, opcoesCookie);
  revalidatePath("/", "layout");
}
