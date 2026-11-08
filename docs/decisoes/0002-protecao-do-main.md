# 0002 — Proteção do branch main

Status: **aceita, pendente de ativação**. Data: 2026-11-08.

## Contexto

Repositório privado em conta GitHub gratuita: o GitHub não aplica regras de
proteção de branch nem rulesets. Decisão do responsável: seguir sem a trava
técnica, sempre com branch e PR, e ligar antes do piloto.

## Regra combinada (vale desde já, por disciplina)

- Nada entra no `main` sem PR.
- PR só entra com CI verde e aprovação do responsável.
- Proibido push direto e force-push no `main`.

## Como ligar (quando houver GitHub Pro, organização paga ou repo público)

Settings → Rules → Rulesets → New branch ruleset:
- Alvo: `main`. Enforcement: Active.
- Restrict deletions; Block force pushes.
- Require a pull request before merging (1 aprovação; descartar aprovação
  com novo commit).
- Require status checks to pass: `lint`, `tipos`, `vitest`, `playwright`,
  `pgtap`, `semgrep`, `gitleaks`. Require branches to be up to date.

Ou pelo terminal, depois do upgrade: `gh api` com o JSON em
`.github/ruleset-main.json` (criado na tarefa de CI).

## Pendência

Ativar antes do piloto. Custo: GitHub Pro (pago) — não contratar sem aviso.
