import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import {
  COOKIE_ATIVIDADE,
  COOKIE_SECRETARIA,
  INATIVIDADE_MS,
  ehCookieSupabase,
  opcoesCookie,
} from "@/features/sessao/cookies";
import { ipDaRequisicao } from "@/features/login/seguranca";

// CSP com nonce por requisição. Só o hash do script de tema não basta: o Next
// injeta scripts inline próprios, que o navegador bloquearia.
function storage() {
  try {
    return process.env.NEXT_PUBLIC_SUPABASE_URL ? ` ${new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin}` : "";
  } catch {
    return "";
  }
}

function politica(nonce: string) {
  const dev = process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : "";
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob:${storage()}`,
    "font-src 'self'",
    // Envio e leitura do PDF vão direto ao Storage (links assinados); o pdf.js
    // roda num worker do próprio site.
    `connect-src 'self'${storage()}`,
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

export async function proxy(req: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const csp = politica(nonce);
  const seguir = () => {
    const cabecalhos = new Headers(req.headers);
    cabecalhos.set("x-nonce", nonce);
    cabecalhos.set("content-security-policy", csp);
    return NextResponse.next({ request: { headers: cabecalhos } });
  };
  let resposta = seguir();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const temSessao = req.cookies.getAll().some((c) => ehCookieSupabase(c.name));

  if (url && chave && temSessao) {
    const supabase = createServerClient(url, chave, {
      cookieOptions: opcoesCookie,
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (lista) => {
          for (const { name, value } of lista) req.cookies.set(name, value);
          resposta = seguir();
          for (const { name, value, options } of lista) {
            resposta.cookies.set(name, value, { ...options, ...opcoesCookie });
          }
        },
      },
    });

    // 30 min sem uso: registra, encerra a sessão no Supabase e apaga os cookies.
    const ultima = Number(req.cookies.get(COOKIE_ATIVIDADE)?.value);
    if (!(Date.now() - ultima <= INATIVIDADE_MS)) {
      try {
        await supabase.rpc("registrar_auditoria", {
          p_acao: "sessao.inatividade",
          p_ip: ipDaRequisicao(req.headers),
        });
        await supabase.auth.signOut({ scope: "local" });
      } catch {
        // Sem rede com o Supabase: os cookies saem do mesmo jeito.
      }
      // 303 transforma o POST de uma Server Action (ex.: Sair) em GET.
      const destino = NextResponse.redirect(
        new URL("/entrar?motivo=inatividade", req.url),
        req.method === "GET" ? 307 : 303,
      );
      for (const c of req.cookies.getAll()) {
        if (ehCookieSupabase(c.name) || c.name === COOKIE_SECRETARIA || c.name === COOKIE_ATIVIDADE) {
          destino.cookies.delete(c.name);
        }
      }
      destino.headers.set("content-security-policy", csp);
      return destino;
    }

    // Renova o token vencido (Server Components não gravam cookie).
    await supabase.auth.getClaims();
    resposta.cookies.set(COOKIE_ATIVIDADE, String(Date.now()), opcoesCookie);
  }

  resposta.headers.set("content-security-policy", csp);
  return resposta;
}

export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico|ocr/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
      // Pré-carregamento do Next não conta como uso.
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
