import type { ErrorEvent } from "@sentry/nextjs";

// Alerta de erro sem dado pessoal nem conteúdo de documento (decisão 0014).
// O app já não põe esses dados em erro (regra 3 do CLAUDE.md); isto é a segunda
// barreira: tira pessoa, requisição, rastros e variáveis, corta a consulta das
// URLs (a busca pode ter texto de documento) e mascara o que sobrar no texto.

const LINHA_DO_BANCO = /(Failing row contains|Key) \([^]*?\)(=\([^]*?\))?/g;
const EMAIL = /[^\s@<>"'(),;]+@[^\s@<>"'(),;]+\.[^\s@<>"'(),;]+/g;
const CPF = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g;
const MAXIMO = 500;

export function limparTexto(t: string): string {
  return t
    .replace(LINHA_DO_BANCO, "$1 [dados removidos]")
    .replace(EMAIL, "[e-mail]")
    .replace(CPF, "[cpf]")
    .slice(0, MAXIMO);
}

export function semConsulta(url: string): string {
  return url.split(/[?#]/)[0];
}

const CONTEXTOS_TECNICOS = ["os", "runtime", "browser", "device", "app", "trace"];

export function limparEvento(evento: ErrorEvent): ErrorEvent {
  delete evento.user;
  delete evento.extra;
  delete evento.breadcrumbs;
  delete evento.server_name;
  if (evento.request) evento.request = { url: evento.request.url && semConsulta(evento.request.url), method: evento.request.method };
  if (evento.transaction) evento.transaction = semConsulta(evento.transaction);
  if (evento.message) evento.message = limparTexto(evento.message);
  if (evento.contexts) {
    evento.contexts = Object.fromEntries(Object.entries(evento.contexts).filter(([k]) => CONTEXTOS_TECNICOS.includes(k)));
  }
  for (const ex of evento.exception?.values ?? []) {
    if (ex.value) ex.value = limparTexto(ex.value);
    for (const quadro of ex.stacktrace?.frames ?? []) delete quadro.vars;
  }
  return evento;
}

// Opções comuns ao navegador e ao servidor. Sem DSN, fica desligado.
export function opcoesSentry(dsn: string | undefined, ambiente: string | undefined) {
  return {
    dsn,
    enabled: Boolean(dsn),
    environment: ambiente || "development",
    sendDefaultPii: false,
    tracesSampleRate: 0,
    maxBreadcrumbs: 0,
    beforeBreadcrumb: () => null,
    beforeSend: limparEvento,
  };
}
