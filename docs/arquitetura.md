# Arquitetura

Visão resumida. O detalhe está em `docs/plano-de-desenvolvimento.md`.

## Peças

| Peça | Onde | Papel |
| --- | --- | --- |
| App Next.js | Vercel | Telas e Server Actions (validação com Zod) |
| Postgres | Supabase, São Paulo | Dados, com RLS por prefeitura e secretaria |
| Auth | Supabase | Login; o token carrega o vínculo do usuário |
| Storage | Supabase, privado | PDFs e etiquetas, por links assinados curtos |
| CI | GitHub Actions | Lint, tipos, testes, pgTAP, Semgrep, Gitleaks |

## Isolamento

Uma aplicação para todas as prefeituras. O isolamento fica no banco:

1. Toda tabela de cliente tem `prefeitura_id` (acervo: também `secretaria_id`).
2. RLS ligado em todas; políticas usam funções do esquema `app`
   (ex.: `app.prefeitura_atual()`), que leem o vínculo do token.
3. Sem GRANT explícito, a tabela não existe para a Data API.
4. Teste pgTAP de isolamento em toda tabela, rodando em todo PR.

## Chaves

- Navegador: só URL do Supabase e chave anon (pública por natureza; o RLS
  protege os dados).
- Servidor: `service_role` só quando inevitável, nunca exposta ao cliente.

## Ambientes

Ver `docs/decisoes/0001-ambientes.md`: Supabase local no CI para testes,
projeto `liccont` para produção.
