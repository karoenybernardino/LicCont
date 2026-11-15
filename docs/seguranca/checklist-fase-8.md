# Checklist de segurança — Fase 8

Legenda: **ok** = existe e tem prova automática; **parcial** = existe, falta prova ou item externo; **aberto** = depende de pessoa, dinheiro ou domínio.

| # | Item | Estado | Prova |
| --- | --- | --- | --- |
| 1 | RLS ligado em toda tabela de `public`, hoje e no futuro | ok | `supabase/tests/seguranca_geral.test.sql` |
| 2 | Nenhum privilégio de tabela para `anon` | ok | idem |
| 3 | `service_role` sem acesso direto fora das tabelas de cadastro do servidor | ok | idem |
| 4 | Só `vinculos` tem DELETE para `authenticated` | ok | idem |
| 5 | Isolamento entre prefeituras e secretarias, por tabela | ok | um teste pgTAP por tabela (`supabase/tests/*isolamento*`, `tce`, `painel`, `relatorios`, `fase8_equipe_aceites`) |
| 6 | Equipe LicCONT não lê o acervo | ok | `fase8_equipe_aceites.test.sql` (equipe vê 0 documentos); só números por `equipe_uso_prefeituras()` |
| 7 | Acesso de suporte só com autorização do administrador, até 5 h, revogável e auditado | parcial | mecanismo e testes prontos; **nenhuma política de leitura foi aberta ao suporte** (ver decisão abaixo) |
| 8 | Auditoria só de inclusão | ok | trigger `auditoria_imutavel`, teste de acesso |
| 9 | Cabeçalhos: CSP com nonce, HSTS, `X-Frame-Options`, sem `x-powered-by` | ok | `tests/e2e/smoke.spec.ts` |
| 10 | `style-src 'unsafe-inline'` na CSP | aberto | exigido pelo Next/Tailwind hoje; reavaliar quando houver nonce para estilos |
| 11 | Senha forte, vazamento (k-anonimato), força bruta, saída por inatividade, 2º fator | ok | decisão 0006, testes da Fase 1 |
| 12 | Nenhum segredo no navegador | ok | só `NEXT_PUBLIC_*`; Semgrep e Gitleaks no CI |
| 13 | Varredura de segredos | ok | Gitleaks no PR (commits) e na `main` (histórico inteiro) |
| 14 | Dependências de produção sem vulnerabilidade alta/crítica | ok | `npm audit --omit=dev --audit-level=high` no CI; Dependabot semanal |
| 15 | Aceite de política e termo antes do uso | ok | tabela `aceites`, tela `/aceite`, teste pgTAP; versão em `src/features/site/versao.ts` |
| 16 | Exportação só do administrador, auditada sem conteúdo | ok | `registrar_exportacao`, teste pgTAP, `pacote.test.ts` |
| 17 | CSV protegido contra fórmula | ok | `neutralizarCelula`, testes de planilha/relatório/exportação |
| 18 | Pedido de demonstração sem leitura pública | ok | `pedidos_demonstracao.test.sql` |
| 19 | Rotação das chaves antes do piloto | aberto | `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, `LOGIN_HASH_SEGREDO`: gerar novas na Vercel antes de usar dado real |
| 20 | Backup e restauração ensaiados | aberto | `docs/seguranca/backup-restauracao.md` (rodar o ensaio) |
| 21 | Teste de invasão | parcial | `docs/seguranca/pentest-alternativa-gratuita.md` (autoavaliação); pentest pago só com aprovação |
| 22 | Textos jurídicos validados por advogado | aberto | `docs/lgpd/` |
| 23 | Contato de segurança real no `SECURITY.md` | aberto | depende de e-mail e domínio |

## Decisão sobre o acesso de suporte (item 7)

O mecanismo registra a autorização (quem, quando, por quê, até quando, revogação)
e a equipe vê só "há autorização valendo até X". Para não abrir risco de furar o
isolamento, **nenhuma tabela de acervo ganhou política de leitura para a equipe**.
Hoje o suporte com autorização acontece com o administrador operando junto
(compartilhamento de tela) ou pela exportação. Abrir leitura direta exige uma
política por tabela e um teste de isolamento por tabela: fazer só se o
responsável pedir e depois do advogado validar.
