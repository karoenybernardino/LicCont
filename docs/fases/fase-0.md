# Fase 0 — Fundação

Status: **concluída em 2026-11-08** (ver "Resultado" no fim). Aprovada em 2026-11-08. Segue `docs/plano-de-desenvolvimento.md`;
onde este texto e o plano divergirem, vale o que foi decidido abaixo.

## Por quê

O LicCONT vai guardar o arquivo morto (licitações e contratos) de prefeituras.
É dado público misturado com dado pessoal, de vários clientes no mesmo banco.
A Fase 0 não entrega funcionalidade: entrega as travas que impedem erro caro
depois — isolamento entre prefeituras, nenhuma chave no navegador, segredos
fora do código e CI que barra o PR antes de entrar.

## Objetivos

1. Estrutura de pastas e regras fixas (CLAUDE.md, SECURITY.md, docs/).
2. App Next.js inicial publicado no endereço provisório da Vercel, com tema
   claro e escuro e componentes base, em português.
3. Supabase CLI configurado e ligado ao projeto `liccont`; primeira migração
   com a convenção de GRANT e RLS; teste pgTAP de exemplo.
4. Desenho de ambientes registrado em `docs/decisoes/`.
5. CI em todo PR: lint, tipos, Vitest, Playwright (smoke), pgTAP, Semgrep,
   Gitleaks. Dependabot ligado.
6. Regra de proteção do main documentada como pendência.
7. Modelo de PR.

## Fora do escopo (não fazer)

- Qualquer tela ou tabela de negócio (licitações, contratos, upload) — Fase 1.
- Login funcionando. A Fase 0 só deixa o cliente Supabase pronto.
- Domínio próprio.
- Qualquer coisa paga. Só planos gratuitos até aviso.
- Dados reais de prefeitura. Só dados fictícios em `supabase/seed.sql`.

## Fracasso mesmo funcionando

- Chave `service_role` ou segredo em código, log, bundle do navegador ou
  histórico do git.
- Tabela exposta pela Data API sem RLS ou sem GRANT explícito.
- CI verde que na prática não testa nada (teste vazio, job pulado).

## Decisões já tomadas (pelo usuário)

- Stack: Next.js (App Router), TypeScript estrito, Tailwind, Server Actions
  com Zod; Supabase (Postgres, Auth, Storage, região São Paulo, projeto
  `liccont`); Vercel; Vitest, Playwright, pgTAP.
- Banco: Data API ligada, "expor novas tabelas automaticamente" desligado,
  RLS automático ligado. Toda tabela nova: RLS + GRANT explícito só para os
  papéis necessários + teste de isolamento pgTAP. Dado de cliente carrega
  `prefeitura_id`; acervo carrega também `secretaria_id`.
- pgTAP roda **só no CI** (sem Docker na máquina local).
- Main sem proteção agora (conta gratuita, repo privado). Trabalho sempre em
  branch + PR. Regra pronta em `docs/decisoes/0002-protecao-do-main.md`.
- Marca provisória: fonte Sora (LIC peso 300, CONT peso 700). Cores:
  petróleo `#0B2E3A`, teal `#0E7490`, aqua `#2DD4BF`, menta `#CCFBF1`,
  aço `#4F8592`, fundo claro `#F3F8F9`. Modo escuro: preto puro com degradê
  e luz petróleo no canto; cores da marca só como destaque. Texto, linhas e
  superfícies ficam como pendência até o guia em `docs/marca/`.

## Decisões minhas (revise)

- **Gerenciador de pacotes:** npm (já instalado; evita mais uma ferramenta).
- **Supabase CLI:** fora do `package.json` (o pacote baixa um binário na
  instalação e deixava o `npm ci` lento). Na máquina: `npx supabase@3.0.0`;
  no CI: `supabase/setup-cli` na mesma versão.
- **Vercel CLI:** instalada globalmente (feito).
- **Tema:** variáveis CSS (tokens) no atributo `data-theme` do `<html>`,
  ligadas ao Tailwind. Sem `next-themes`: um script curto no layout aplica o
  tema salvo ou o do sistema antes da primeira pintura (receita oficial do
  Next) e o rótulo do botão troca só por CSS.
- **Componentes base:** só o que a Fase 1 vai usar de cara — Botão, Campo de
  texto, Cartão, Logo (LIC/CONT) e o seletor de tema. Sem biblioteca de
  componentes por enquanto.
- **Página inicial:** tela simples com a marca, o nome do produto e o seletor
  de tema. Serve de smoke test.
- **Primeira migração (só a convenção, decidido pelo usuário):** esquema
  `app`, função `app.prefeitura_atual()` que lê a `prefeitura_id` do JWT e
  revogação dos privilégios padrão para `anon` e `authenticated` em tabelas
  novas. Nenhuma tabela de negócio: `prefeituras` e as demais nascem na
  Fase 1 com as regras do plano (`prefeituras` só visível para a equipe
  LicCONT).
- **pgTAP de exemplo:** cria uma tabela `exemplo_isolamento` (com
  `prefeitura_id`) **dentro da transação do teste**, aplica a convenção e
  prova o isolamento; o `ROLLBACK` final apaga tudo. Assim a produção recebe
  só a convenção, sem tabela de exemplo.
- **De onde vem a `prefeitura_id` (provisório):** um único uuid em
  `app_metadata.prefeitura_id` do JWT, que o usuário não consegue alterar.
  Toda política chama só `app.prefeitura_atual()`, então trocar a origem na
  Fase 1 (tabela de vínculos + hook de token, usuário com várias prefeituras,
  equipe LicCONT com acesso amplo) muda uma função, não as políticas.
  Essa escolha de modelo fica para a Fase 1.
  O teste usa dois usuários fictícios de prefeituras diferentes: um não
  enxerga a linha do outro; `anon` não lê nada.
- **Migrações em produção:** só manuais na Fase 0 (`npx supabase@3.0.0 db push --remote`,
  rodado pelo responsável). O plano prevê o main aplicando sozinho; essa
  decisão foi adiada e precisa ser retomada **antes da Fase 1**.
- **Revisão de segurança:** cada PR passa pelo agente `auditor-seguranca`
  além do revisor de código.
- **Acessibilidade:** o smoke do Playwright roda o axe na página inicial.
- **CI:** um workflow `ci.yml` com jobs paralelos: `lint`, `tipos`, `vitest`,
  `playwright`, `pgtap` (Supabase local no runner), `semgrep`, `gitleaks`.
  Semgrep e Gitleaks na versão gratuita/aberta, sem conta (Gitleaks pela
  CLI, não pela action, que exige licença se o repo virar de organização).
- **Publicação:** integração Git da Vercel (plano Hobby, gratuito). PR gera
  endereço de prévia; o main publica sozinho.

- **Suboperadores (`docs/lgpd/suboperadores.md`):** tabela simples com
  fornecedor, finalidade, dados tratados, região e link da política —
  Supabase, Vercel e GitHub. Semgrep e Gitleaks rodam no CI sem receber dado
  pessoal e ficam listados como ferramentas, não suboperadores. Não é o
  registro formal de operações (ROPA) da LGPD; esse fica para antes do piloto.

## Atenção: termos de uso dos planos gratuitos

- **Vercel Hobby** é só para uso não comercial. Para a Fase 0 (sem cliente)
  serve; antes do piloto com prefeitura vai precisar do plano Pro. Fica
  registrado como pendência de custo em `docs/decisoes/0001-ambientes.md`.
- **Supabase gratuito** pausa o projeto após 7 dias sem uso e permite no
  máximo 2 projetos gratuitos ativos por conta.

## Entregas e ordem (uma branch e um PR por tarefa)

| # | Branch | Entrega | Como provar |
|---|--------|---------|-------------|
| 0 | `main` | Commit inicial com `.gitignore` e README curto (base para os PRs) | Repo deixa de estar vazio |
| 1 | `fase-0/estrutura` | Pastas, CLAUDE.md, SECURITY.md, docs (arquitetura; decisões 0001 ambientes, 0002 proteção do main, 0003 serviços externos da Fase 0; `lgpd/suboperadores.md`), modelo de PR | Revisão do PR |
| 2 | `fase-0/app` | Next.js + Tailwind + tema + componentes base + Vitest + Playwright smoke | Testes passam; prévia da Vercel abre |
| 3 | `fase-0/supabase` | `supabase init`, link, migração com GRANT/RLS, pgTAP de exemplo, `seed.sql` fictício | pgTAP passa no CI |
| 4 | `fase-0/ci` | Workflow completo + Dependabot | Um PR de teste com segredo falso faz o Gitleaks falhar; depois removido |

Teste antes do código em cada tarefa: o teste (Vitest, Playwright ou pgTAP)
entra primeiro e falha; o código vem depois. Cada PR passa por revisão de
outro agente antes de eu abrir.

## O que você precisa fazer (sem colar nada no chat)

Listado também em cada PR, com o lugar exato:

- `npx supabase@3.0.0 login` e
  `npx supabase@3.0.0 link --project-ref ogbgszivnrbouyfuxqry` (o ref é do
  **projeto** LicCont, não da organização).
- Ligar o repositório na Vercel (Import Project).
- Variáveis na Vercel: nenhuma na Fase 0. Na Fase 1, quando o app ler dados:
  `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Segredos no GitHub (Settings → Secrets → Actions): nenhum na Fase 0, salvo
  se quisermos aplicar migrações pelo CI (decisão adiada).

## Pendências que ficam para depois da Fase 0

- Cores de texto, linhas e superfícies (guia em `docs/marca/`).
- Ligar a proteção do main antes do piloto.
- Plano Vercel Pro antes do piloto.
- Ambiente de homologação com banco (ver decisão 0001).
- **Antes da Fase 1:** decidir se o CI aplica as migrações em produção.
- Domínio próprio (o plano previa na Fase 0; adiado, é pago).
- Contato de segurança (`SECURITY.md`) e plano de resposta a incidentes.
- CSP com hash do script de tema, antes do login.
- Conferir no painel do Supabase se o cadastro público está desligado.

## Resultado (2026-11-08)

| Critério de pronto | Situação |
| --- | --- |
| CI roda testes, lint, tipos e busca de segredos em todo PR | Feito. 7 checks (`lint`, `tipos`, `vitest`, `playwright`, `pgtap`, `semgrep`, `gitleaks`) verdes no `main`. Gitleaks barrou token falso num PR descartável (#5, fechado sem merge). |
| App no endereço provisório da Vercel | Feito: https://lic-cont.vercel.app. Publica sozinho a partir do `main`. |
| PR final aprovado | Feito: PRs #1 a #4 mesclados. |

Também feito:
- Migração da convenção aplicada em produção (`db push --remote`) e conferida
  por consulta de leitura: `app.prefeitura_atual()` existe, `anon` não executa.
- RLS automático de produção confirmado (gatilho `ensure_rls`).

Achados que valem para a Fase 1:
- Com "expor tabelas automaticamente" desligado, nem o `service_role` ganha
  leitura/escrita automática em tabelas novas: GRANT explícito também para ele.
- O modelo de teste precisa cobrir INSERT/UPDATE com `WITH CHECK`.
- A prefeitura vem do token (validade de 1 hora): retirar vínculo leva até
  1 hora para valer.
- Ligar os alertas do Dependabot (Settings → Code security).
