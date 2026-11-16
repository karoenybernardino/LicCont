import * as Sentry from "@sentry/nextjs";
import { opcoesSentry } from "@/lib/alertas/limpar";

// Alerta de erro do navegador (decisão 0014): sem replay, sem rastros, sem dado de quem usa.
Sentry.init(opcoesSentry(process.env.NEXT_PUBLIC_SENTRY_DSN, process.env.NEXT_PUBLIC_VERCEL_ENV));
