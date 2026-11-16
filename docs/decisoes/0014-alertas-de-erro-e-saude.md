# 0014 — Alertas de erro (Sentry) e rota de saúde

Data: 2026-11-16. Estado: aceita (região e transferência internacional a validar com o advogado antes do piloto).

## Contexto
Erro em produção só aparecia nos logs da Vercel, que ninguém olha a toda hora. Faltava
também uma forma de saber, de fora, se o app, o banco e o Storage estão no ar.

## Decisão
- **Sentry, plano gratuito (Developer)**, pelo pacote `@sentry/nextjs` (versão exata,
  regra da 0004). Liga só com a variável `NEXT_PUBLIC_SENTRY_DSN` na Vercel. Sem ela,
  fica desligado. O DSN é público por natureza (só permite enviar evento), então pode ir
  ao navegador, como a chave anon.
- **Nada de dado pessoal nem conteúdo de documento** (`src/lib/alertas/limpar.ts`, com teste):
  - sem dados de quem usa (`sendDefaultPii: false`), sem replay de tela, sem rastros
    (breadcrumbs), sem medição de desempenho e sem variáveis locais;
  - a requisição vai só com método e caminho: sem consulta, cookies, cabeçalhos e corpo,
    porque a busca pode ter texto de documento;
  - o texto do erro passa por máscara de CPF, e-mail e da linha que o Postgres devolve
    ("Failing row contains (...)", "Key (...)=(...)"), e é cortado em 500 caracteres.
  - Essa máscara é a segunda barreira: a primeira é a regra 3 do CLAUDE.md (o app não
    põe dado pessoal em erro).
- Projeto no Sentry: escolher a **região da UE (Frankfurt)** ao criar a organização,
  ligar "Prevent Storing of IP Addresses" e manter os Data Scrubbers padrão.
- **Rota `/api/saude`**: pública, responde só `ok` ou `falha` do banco (função
  `public.saude()`, só `service_role`) e do Storage (bucket `acervo`), com 5 s de limite
  por parte. Sem detalhe de erro.
- **Checagem externa: UptimeRobot (gratuito)** chama `/api/saude` a cada 5 minutos e
  avisa por e-mail. Não recebe dado pessoal: só a URL e a resposta da rota. Passo a
  passo em `docs/seguranca/monitoramento.md`.

## Alternativas
- GlitchTip (compatível com o Sentry, aberto): tem menos eventos grátis. Fica como
  plano B sem mudar o código, porque usa o mesmo SDK.
- Só logs da Vercel: sem alerta ativo.

## Pendências
- Transferência internacional (Sentry na UE ou nos EUA): validar a base legal com o advogado.
- Mapas de código (source maps) não são enviados: o erro do navegador chega com o código
  minificado. Ligar depois exige o token `SENTRY_AUTH_TOKEN` no build.
