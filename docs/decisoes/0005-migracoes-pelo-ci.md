# 0005 — Migrações aplicadas pelo CI

Status: **aceita**. Data: 2026-11-08.

## Contexto

Na Fase 0 as migrações chegavam à produção só à mão
(`npx supabase@3.0.0 db push --remote`), rodadas pelo responsável depois do
merge. O plano prevê "o main aplica as migrações no Supabase sozinho". Com
a Fase 1 as migrações passam a ser frequentes, e esquecer uma deixa o app
publicado esperando tabela que não existe.

## Decisão

O job `migracoes` do `.github/workflows/ci.yml` aplica as migrações no
projeto LicCont (`ogbgszivnrbouyfuxqry`):

- Só em `push` no `main` (depois do merge), nunca em PR.
- Só depois de `lint`, `tipos`, `vitest`, `playwright`, `pgtap`, `semgrep`
  e `gitleaks` passarem.
- Um de cada vez (`concurrency` próprio) e sem cancelar no meio. O
  workflow inteiro também deixou de cancelar execuções no `main`.
- Usa `supabase db push --remote=<string de conexão>`, que aplica só as
  migrações ainda não registradas no histórico do banco. Sem
  `--include-all`: migração com data anterior à última aplicada faz o job
  falhar, de propósito.
- Se chegarem vários pushes seguidos, o GitHub pode trocar uma execução
  que ainda está na fila pela mais nova. Não há perda: a mais nova aplica
  tudo o que estiver pendente, e a que já está rodando nunca é cancelada.
- Não é checagem obrigatória do ruleset (`docs/decisoes/0002`): não roda
  em PR.

## Segredo

GitHub → Settings → Secrets and variables → Actions → New repository
secret. Nunca no chat nem no código.

| Nome | Onde obter |
| --- | --- |
| `SUPABASE_DB_URL` | Painel do projeto LicCont → botão **Connect** → **Session pooler** (porta 5432). Trocar `[YOUR-PASSWORD]` pela senha do banco. Use senha só com letras e números, para o GitHub conseguir esconder a string inteira no log |

Por que a string de conexão e não o token da conta (`SUPABASE_ACCESS_TOKEN`):
ela só abre o banco do LicCont. O token abriria todos os projetos da conta,
inclusive os do Prummo. O pooler é necessário porque os runners do GitHub
não têm IPv6, e a conexão direta do Supabase é só IPv6.

Sem o segredo o job falha com mensagem clara e nada é aplicado.

## Regras para toda migração

1. **Compatível com a versão anterior do app.** A Vercel publica o app ao
   mesmo tempo que o job roda, sem esperar. Mudança que remove ou renomeia
   algo vai em dois PRs: primeiro adiciona (e o app passa a usar o novo),
   depois remove ("expandir e depois contrair").
2. **Backup à mão antes de apagar ou alterar dado.** O plano gratuito do
   Supabase não tem backup diário. O PR traz o passo de
   `npx supabase@3.0.0 db dump` feito pelo responsável antes do merge.
3. **Migração que falha no meio:** o job fica vermelho no `main`. Não
   rodar de novo às cegas: abrir PR de correção.

## Riscos aceitos

- **PR de branch deste repositório recebe os segredos.** Só PRs de fork e
  do Dependabot ficam sem eles (padrão do GitHub). Um PR que altere o
  `ci.yml` poderia rodar `db push` ou expor a string de conexão antes da
  revisão. Aceito porque só o responsável e os agentes dele criam
  branches. Mitigação: todo PR que mexe em `.github/` é conferido linha a
  linha antes do merge e destacado na descrição; a credencial vale só para
  o banco do LicCont; trocar a senha do banco se houver suspeita.
- **Migração errada vai para produção sem passo manual.** Mitigação: o
  pgTAP no CI aplica todas as migrações do zero a cada PR, e o responsável
  aprova o PR antes do merge.
- O job não roda `npm ci`: nenhuma dependência do npm executa com o
  segredo disponível. Nunca ligar `--debug` nem `ACTIONS_STEP_DEBUG` nele.

## Revisar

Antes do piloto: com Supabase Pro (backup diário) e GitHub pago,
colocar o segredo num Environment `producao` restrito ao `main`, com
aprovação manual antes do job (Environment em repositório privado exige
GitHub pago).
