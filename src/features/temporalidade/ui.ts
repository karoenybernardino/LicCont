// Cores exatas dos quadros da Fase 7 (claro / escuro). Tailwind lê estas
// strings inteiras, por isso nenhuma é montada por partes.
export const LINHA = "border-[rgba(11,46,58,.12)] dark:border-[#1b3a44]";
export const TXT = "text-[#0b2e3a] dark:text-[#f2f8f9]";
export const SUAVE = "text-[#3f5e66] dark:text-[#9bb8bf]";
export const CAMPO = "bg-white dark:bg-[#05090b]";
export const BLOCO = "bg-[rgba(255,255,255,.6)] dark:bg-[#0a1418]";
export const AVISO_AZUL = "border-[#cfe8ec] bg-[#eef8f9] dark:border-[rgba(45,212,191,.25)] dark:bg-[rgba(45,212,191,.06)]";
export const AVISO_AMBAR = "border-[#fcd9a0] bg-[#fff7e6] dark:border-[rgba(255,159,28,.35)] dark:bg-[rgba(255,159,28,.08)]";
export const ROTULO = `text-[11px] font-medium tracking-[.05em] uppercase ${SUAVE}`;
export const FOCO = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0e7490] dark:focus-visible:outline-[#2dd4bf]";
export const REALCE = "hover:border-[#0e7490] dark:hover:border-[#2dd4bf]";
export const BOTAO_CONTORNO = `inline-flex min-h-10 items-center justify-center rounded-lg border ${LINHA} bg-transparent px-5 text-sm font-medium whitespace-nowrap ${TXT} ${REALCE} ${FOCO} disabled:opacity-55`;
export const BOTAO_PRIMARIO = `inline-flex min-h-10 items-center justify-center rounded-lg border-0 bg-[linear-gradient(135deg,#0e7490_0%,#0f766e_100%)] px-5 text-sm font-semibold whitespace-nowrap text-white dark:bg-none dark:bg-[#2dd4bf] dark:text-[#0b2e3a] hover:opacity-90 ${FOCO} disabled:opacity-55`;
// Seleção (cartão de opção, aba marcada, linha em foco).
export const SELECAO = "bg-[rgba(45,212,191,.18)] dark:bg-[linear-gradient(90deg,rgba(45,212,191,.2),rgba(45,212,191,0))]";
