import "server-only";
import { cookies } from "next/headers";
import { COOKIE_PERFIL_DEMO, PERFIS_DEMO, type PerfilDemo } from "./dados";

// Perfil com que a pessoa "entrou" na demonstração (null = ainda não entrou).
export async function perfilDemo(): Promise<PerfilDemo | null> {
  const valor = (await cookies()).get(COOKIE_PERFIL_DEMO)?.value;
  return valor && valor in PERFIS_DEMO ? (valor as PerfilDemo) : null;
}
