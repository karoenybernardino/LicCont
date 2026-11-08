// Cookies do app. Todos HttpOnly, Secure e SameSite=Lax (docs/fases/fase-1.md,
// Controles técnicos). Usado também pelo proxy, por isso sem "server-only".
export const COOKIE_PREFEITURA = "liccont_prefeitura";
export const COOKIE_SECRETARIA = "liccont_secretaria";
export const COOKIE_ATIVIDADE = "liccont_atividade";

export const INATIVIDADE_MS = 30 * 60 * 1000;

export const opcoesCookie = {
  httpOnly: true,
  secure: true,
  sameSite: "lax",
  path: "/",
} as const;

// Nomes dos cookies de sessão do Supabase (sb-<projeto>-auth-token, em partes).
export const ehCookieSupabase = (nome: string) => /^sb-.+-auth-token/.test(nome);
