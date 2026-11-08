# 0004 — Atualização de dependências

Status: **aceita**. Data: 2026-11-08.

## Contexto

Logo depois de ligado, o Dependabot abriu 9 PRs de uma vez. Sete eram versões
major (TypeScript 7, ESLint 10, `@types/node` 26 e quatro ações do GitHub),
que podem quebrar o projeto e pedem trabalho próprio. Os dois de React vieram
separados (`react` e `react-dom`), e cada um sozinho quebra o build, porque as
duas versões precisam ser iguais.

## Decisão

- **Bibliotecas do app (npm), major:** ignorada por enquanto. Quando uma for
  necessária, entra por PR próprio, com plano curto e testes.
- **Bibliotecas do app (npm), patch e minor:** agrupadas em **um PR por
  semana**, toda segunda às 6h (horário de Fortaleza). Assim `react` e
  `react-dom` sobem juntos.
- **Ações do GitHub** (`actions/checkout`, `actions/setup-node`,
  `actions/upload-artifact`, `supabase/setup-cli`): major **não** é ignorada.
  Todas as atualizações de ações vêm agrupadas num **único PR**, que deve ser
  revisado e mesclado **antes do piloto**. Até lá esse PR pode ficar aberto
  (o Dependabot o mantém atualizado).
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

Antes do piloto:
- revisar e mesclar o PR único das ações do GitHub (hoje: `actions/checkout` 7,
  `actions/setup-node` 7, `actions/upload-artifact` 7, `supabase/setup-cli` 3);
- reavaliar as majors das bibliotecas (TypeScript 7, ESLint 10,
  `@types/node` 26).

Os PRs #6 a #9 (ações) e #12 a #14 (bibliotecas) foram fechados com
comentário apontando para esta decisão. #10 e #11 (React separado) foram
substituídos pelo #16, que sobe os dois juntos.
