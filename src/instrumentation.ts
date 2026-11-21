import * as Sentry from "@sentry/nextjs";
import { opcoesSentry } from "@/lib/alertas/limpar";

// Alerta de erro do servidor (decisão 0014). Sem NEXT_PUBLIC_SENTRY_DSN fica desligado.
export function register() {
  Sentry.init(opcoesSentry(process.env.NEXT_PUBLIC_SENTRY_DSN, process.env.VERCEL_ENV));
}

export const onRequestError = Sentry.captureRequestError;
