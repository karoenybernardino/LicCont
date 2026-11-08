# 0003 — Serviços externos da Fase 0

Status: **aceita**. Data: 2026-11-08.

## Decisão

Na Fase 0 o LicCONT usa só estes serviços externos, todos em plano gratuito:

| Serviço | Para quê | Recebe dado pessoal? | Plano |
| --- | --- | --- | --- |
| Supabase | Banco, Auth, Storage (São Paulo) | Sim, a partir da Fase 1 | Gratuito |
| Vercel | Hospedagem do app | Sim, em trânsito, a partir da Fase 1 | Hobby (gratuito, uso não comercial) |
| GitHub | Código, CI, Dependabot | Não (só dados fictícios) | Gratuito |
| Semgrep (CLI aberta) | Análise estática no CI | Não | Gratuito, sem conta |
| Gitleaks (CLI aberta) | Busca de segredos no CI | Não | Gratuito, sem conta |

As fontes Sora e IBM Plex Sans (Fase 1) vêm do Google Fonts via `next/font`: são baixadas no build e
servidas pelo próprio app, então o navegador do usuário não chama o Google.
Não são suboperadores.

Supabase, Vercel e GitHub entram em `docs/lgpd/suboperadores.md`.
Semgrep e Gitleaks rodam dentro do GitHub Actions e não enviam código nem
dado a terceiros.

## Pendências de custo

- Vercel Pro antes do piloto (Hobby proíbe uso comercial).
- Supabase Pro antes do piloto (backup diário, sem pausa).
- Serviço de e-mail transacional na Fase 1 (nova decisão e novo suboperador).
