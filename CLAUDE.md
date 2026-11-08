# LicCONT — regras do projeto

Arquivo morto de licitações e contratos para prefeituras. Produto próprio,
separado do Prummo. Plano completo: `docs/plano-de-desenvolvimento.md`.
Fase atual: `docs/fases/fase-0.md`.

## Regras fixas (não negociáveis)

1. **Nenhuma tabela nova sem RLS e sem teste de isolamento.** Toda tabela
   nova tem RLS ligado, GRANT explícito só para os papéis necessários (nunca
   para `anon` sem motivo registrado) e um teste pgTAP que tenta ler dado de
   outra prefeitura e precisa falhar.
2. **Nenhuma chave privilegiada no navegador.** `service_role` e qualquer
   segredo só no servidor (variáveis da Vercel e do GitHub). No navegador,
   só variáveis `NEXT_PUBLIC_*` públicas por natureza (URL e chave anon).
3. **Nenhum dado pessoal em log ou mensagem de erro.** Sem CPF, e-mail,
   senha, nome ou conteúdo de documento em `console`, logs ou textos de erro.
   Mensagem de login é sempre a mesma, exista ou não o e-mail.
4. **Nenhum serviço externo novo sem registro** em `docs/decisoes/` e em
   `docs/lgpd/suboperadores.md`.
5. **Textos da interface em português**, com as fontes e cores da marca
   (`src/ui/`, guia em `docs/marca/`).

## Modo demonstração

- `LICCONT_DEMO=1`: telas com dados fictícios de `src/features/demo/`, sem
  banco e sem salvar nada; a faixa amarela troca o perfil. Só em Preview na
  Vercel e na prévia local (`.claude/launch.json`), **nunca em Production**
  (o código recusa com `VERCEL_ENV=production`).
- Tela nova com dados: ler pela camada de dados (`dal.ts`, `dados.ts`,
  `listas.ts`) com o ramo da demonstração; ação que grava devolve
  `AVISO_DEMO` em demonstração.

## Banco (Supabase)

- Toda tabela com dado de cliente carrega `prefeitura_id`; as de acervo
  carregam também `secretaria_id`.
- Políticas de RLS leem o vínculo só por funções do esquema `app`
  (ex.: `app.prefeitura_atual()`), nunca direto do JWT.
- "Expor novas tabelas automaticamente" está desligado: sem GRANT, a tabela
  não aparece na Data API.
- Migrações em `supabase/migrations/`, testes em `supabase/tests/`.
  Só dados fictícios em `supabase/seed.sql`. Nunca dado real de prefeitura.

## Código

- Next.js (App Router), TypeScript estrito, Tailwind.
- Toda entrada validada com Zod no servidor (Server Actions) antes do banco.
- Permissão checada no servidor em toda ação, nunca só escondendo o botão.
- Organização por funcionalidade: `src/features/<funcionalidade>`.

## Fluxo de cada tarefa

1. Atualizar o mapa com o Graphify e ler o trecho afetado.
2. Plano curto em `docs/fases/`.
3. Teste que falha (Vitest, Playwright ou pgTAP).
4. Mínimo de código para passar.
5. Revisão de código e de segurança por outro agente.
6. PR com o modelo (o que mudou, como testar, chaves que faltam).
7. Uma branch por tarefa. Nada direto no `main` (ver `docs/decisoes/0002`).

## Custos

Só planos gratuitos até aviso do responsável. Qualquer coisa paga: parar e
perguntar antes.

## Segredos

Nunca pedir chave ou senha no chat. Listar no PR o que falta e onde colar
(variáveis da Vercel ou segredos do GitHub Actions).
