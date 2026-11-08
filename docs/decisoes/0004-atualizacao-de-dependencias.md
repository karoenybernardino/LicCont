# 0004 — Atualização de dependências

Status: **aceita**. Data: 2026-11-08.

## Contexto

Logo depois de ligado, o Dependabot abriu 9 PRs de uma vez. Sete eram versões
major (TypeScript 7, ESLint 10, `@types/node` 26 e quatro ações do GitHub),
que podem quebrar o projeto e pedem trabalho próprio. Os dois de React vieram
separados (`react` e `react-dom`), e cada um sozinho quebra o build, porque as
duas versões precisam ser iguais.

## Decisão

- **Major:** ignorada por enquanto, em npm e em GitHub Actions. Quando uma for
  necessária, entra por PR próprio, com plano curto e testes.
- **Patch e minor:** agrupadas em **um PR por semana** por ecossistema (npm e
  Actions), toda segunda às 6h (horário de Fortaleza). Assim `react` e
  `react-dom` sobem juntos.
- **Intervalo mínimo:** 7 dias depois do lançamento antes de propor a versão,
  para evitar versão quebrada ou maliciosa recém-publicada.
- **Merge:** só com os 7 checks verdes e aprovação do responsável.
- **Atualizações de segurança** (alertas do Dependabot) são tratadas na hora,
  mesmo que sejam major. Pela documentação do GitHub, o `ignore` por tipo de
  versão não bloqueia essas atualizações; conferir no primeiro alerta real.

## Fora do Dependabot

As imagens do Semgrep e do Gitleaks no `ci.yml` não são atualizadas pelo
Dependabot: revisar à mão a cada fase.

## Revisar

Antes do piloto: reavaliar as majors pendentes (TypeScript 7, ESLint 10,
`@types/node` 26, `actions/checkout` 7, `actions/setup-node` 7,
`actions/upload-artifact` 7, `supabase/setup-cli` 3).
