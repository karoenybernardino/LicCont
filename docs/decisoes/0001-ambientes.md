# 0001 — Ambientes de teste e produção

Status: **aceita (opção A)**. Data: 2026-11-08.

## Contexto

Precisamos de um lugar para testar mudanças no banco sem tocar nos dados de
produção. Hoje só existe o projeto Supabase `liccont` (São Paulo, plano
gratuito). O plano gratuito do Supabase permite até 2 projetos ativos por
conta e pausa projetos parados há 7 dias.

## Opções

**A. Supabase local para teste + `liccont` para produção (recomendada agora)**
- CI sobe o Supabase local (Docker no runner do GitHub) a cada PR, aplica as
  migrações do zero, roda pgTAP e descarta. Custo zero.
- Prévias da Vercel (endereços de PR) **não** recebem chave de banco na
  Fase 0 — o app ainda não lê dados.
- Produção: `liccont`. Migrações aplicadas manualmente com
  `npx supabase db push` depois do merge, até decidirmos automatizar.
- Contra: não há banco de homologação para clicar com dados antes de
  produzir.

**B. A + segundo projeto `liccont-homolog` para as prévias**
- Prévias da Vercel apontam para homologação, com `seed.sql` fictício.
- Custo zero se a conta tiver vaga para o 2º projeto gratuito (se o Prummo já
  ocupa uma vaga na mesma conta, não há). Pausa a cada 7 dias parado.

**C. Branching do Supabase**
- Banco temporário por PR. Exige plano pago. Descartada por custo.

## Proposta

Opção **A** na Fase 0. Reavaliar **B** no início da Fase 1, quando o app
passar a ler dados — antes disso não há o que homologar.

## Pendências de custo (não contratar sem aviso)

- Vercel Hobby é só para uso não comercial: migrar para Vercel Pro antes do
  piloto com prefeitura.
- Supabase Pro (sem pausa, backups diários) antes do piloto.
