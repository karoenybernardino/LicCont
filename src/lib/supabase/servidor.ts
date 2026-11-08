import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { opcoesCookie } from "@/features/sessao/cookies";

// Sem as variáveis (ex.: prévias da Vercel), as funções devolvem null e as
// telas mostram que o login está indisponível.
function config() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && chave ? { url, chave } : null;
}

const semSessao = { auth: { persistSession: false, autoRefreshToken: false } };

// Cliente com a sessão da pessoa (cookies HttpOnly). Sujeito ao RLS.
export async function clienteSessao() {
  const c = config();
  if (!c) return null;
  const loja = await cookies();
  return createServerClient(c.url, c.chave, {
    cookieOptions: opcoesCookie,
    cookies: {
      getAll: () => loja.getAll(),
      setAll: (lista) => {
        try {
          for (const { name, value, options } of lista) loja.set(name, value, { ...options, ...opcoesCookie });
        } catch {
          // Server Component não grava cookie; o proxy renova a sessão.
        }
      },
    },
  });
}

// Anônimo: só as listas da tela de login.
export function clientePublico() {
  const c = config();
  return c ? createClient(c.url, c.chave, semSessao) : null;
}

// service_role: ignora o RLS. Só no servidor, só para o que o plano manda
// (tentativas de login, auditoria sem sessão, conferências do login).
export function clienteServico() {
  const c = config();
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return c && chave ? createClient(c.url, chave, semSessao) : null;
}
