"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_SECRETARIA, opcoesCookie } from "@/features/sessao/cookies";
import { COOKIE_PARCEIRA_PREF } from "@/features/parceira/escolha";
import { COOKIE_PERFIL_DEMO, PERFIS_DEMO, emDemo } from "./dados";

// Troca o perfil da demonstração e abre a tela inicial desse perfil.
export async function trocarPerfilDemo(formData: FormData) {
  if (!emDemo()) redirect("/");
  const perfil = String(formData.get("perfil"));
  if (!(perfil in PERFIS_DEMO)) redirect("/");
  const loja = await cookies();
  loja.set(COOKIE_PERFIL_DEMO, perfil, { ...opcoesCookie, maxAge: 8 * 60 * 60 });
  loja.set(COOKIE_SECRETARIA, perfil === "administrador" || perfil.startsWith("parceira_") ? "todas" : "de100000-0000-0000-0000-000000000004", opcoesCookie);
  loja.delete(COOKIE_PARCEIRA_PREF);
  redirect(perfil === "equipe" ? "/equipe" : perfil.startsWith("parceira_") ? "/parceira" : "/inicio");
}
