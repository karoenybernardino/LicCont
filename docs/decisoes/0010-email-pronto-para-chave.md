# 0010 — E-mail transacional pronto, desligado até a chave

Data: 2026-11-15 · Fases 5 a 7

## Decisão

O código de envio existe (`src/lib/email/enviar.ts`) e fica **desligado**: só
envia quando as duas variáveis da Vercel existem, `EMAIL_API_KEY` e
`EMAIL_REMETENTE`. Sem elas o envio devolve `desligado`, nada falha e o aviso
continua só na tela (decisão do responsável, Fase 6 e Fase 7).

Serviço previsto: Resend, pela API HTTP (sem biblioteca nova, só `fetch`). Tem
plano gratuito (3.000 e-mails por mês, 100 por dia). Se o responsável preferir
outro serviço, só `enviar.ts` muda.

## O que falta para ligar (a ação é do responsável)

1. Criar a conta no serviço e verificar o domínio do remetente.
2. Colar `EMAIL_API_KEY` e `EMAIL_REMETENTE` nas variáveis da Vercel
   (Production). Nunca no chat, nunca no código.
3. Confirmar com o jurídico a transferência internacional (o serviço fica fora
   do Brasil). A linha em `docs/lgpd/suboperadores.md` passa de "pronto,
   desligado" para "ativo".

## Dados e riscos

Só e-mail institucional e texto curto do aviso, sem CPF e sem conteúdo de
documento. O envio não grava destinatário, assunto nem texto em log ou erro; o
retorno é só o motivo (`desligado`, `invalido`, `recusado`, `indisponivel`).
Tempo máximo de 8 segundos por envio.

## Custo

Gratuito dentro do limite acima. Passar do limite é gasto novo: parar e
perguntar antes (CLAUDE.md).
