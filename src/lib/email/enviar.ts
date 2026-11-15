import "server-only";

// Envio de e-mail transacional, desligado até existir a chave (decisão 0010).
// Sem EMAIL_API_KEY nada sai e nada falha: o aviso continua só na tela.
// Nunca registra destinatário, assunto nem texto em log ou erro.
export type Email = { para: string; assunto: string; texto: string };
export type ResultadoEmail = { enviado: true } | { enviado: false; motivo: "desligado" | "recusado" | "indisponivel" | "invalido" };

const ENDERECO = /^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/;

export function emailLigado(env: Record<string, string | undefined> = process.env): boolean {
  return Boolean(env.EMAIL_API_KEY && env.EMAIL_REMETENTE);
}

export async function enviarEmail(e: Email, env: Record<string, string | undefined> = process.env, envia: typeof fetch = fetch): Promise<ResultadoEmail> {
  if (!emailLigado(env)) return { enviado: false, motivo: "desligado" };
  if (!ENDERECO.test(e.para) || e.assunto.length === 0 || e.assunto.length > 200 || e.texto.length === 0 || e.texto.length > 5000) {
    return { enviado: false, motivo: "invalido" };
  }
  try {
    const r = await envia("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.EMAIL_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: env.EMAIL_REMETENTE, to: [e.para], subject: e.assunto, text: e.texto }),
      signal: AbortSignal.timeout(8000),
    });
    return r.ok ? { enviado: true } : { enviado: false, motivo: "recusado" };
  } catch {
    return { enviado: false, motivo: "indisponivel" };
  }
}
