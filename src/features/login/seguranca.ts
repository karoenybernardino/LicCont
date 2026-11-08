import { createHash, createHmac } from "node:crypto";
import { z } from "zod";

// E-mail nunca vai para tentativas_login: só o HMAC com o segredo do servidor.
export function hashEmail(email: string, segredo: string) {
  return createHmac("sha256", segredo).update(email.trim().toLowerCase()).digest("hex");
}

const ip = z.union([z.ipv4(), z.ipv6()]);

// Na Vercel, x-real-ip e x-forwarded-for são preenchidos pela plataforma.
export function ipDaRequisicao(cabecalhos: Headers): string | null {
  const bruto = (cabecalhos.get("x-real-ip") ?? cabecalhos.get("x-forwarded-for")?.split(",")[0])?.trim();
  return bruto && ip.safeParse(bruto).success ? bruto : null;
}

export type ResultadoVazamento = "vazada" | "livre" | "indisponivel";

// Have I Been Pwned por k-anonimato: só os 5 primeiros caracteres do SHA-1
// saem do servidor. Decisão 0006.
export async function verificarSenhaVazada(
  senha: string,
  buscar: (url: string, init?: RequestInit) => Promise<Response> = fetch,
): Promise<ResultadoVazamento> {
  const sha1 = createHash("sha1").update(senha).digest("hex").toUpperCase();
  try {
    const resposta = await buscar(`https://api.pwnedpasswords.com/range/${sha1.slice(0, 5)}`, {
      headers: { "Add-Padding": "true" },
      signal: AbortSignal.timeout(3000),
      cache: "no-store",
    });
    if (!resposta.ok) return "indisponivel";
    const resto = sha1.slice(5);
    const vazada = (await resposta.text()).split("\n").some((linha) => {
      const [sufixo, vezes] = linha.trim().split(":");
      return sufixo === resto && Number(vezes) > 0;
    });
    return vazada ? "vazada" : "livre";
  } catch {
    return "indisponivel";
  }
}
