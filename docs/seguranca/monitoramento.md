# Monitoramento: alertas de erro e checagem externa

Decisão 0014. Tudo no plano gratuito.

## 1. Alertas de erro (Sentry)

1. Criar a conta em sentry.io (plano Developer, gratuito). Ao criar a organização,
   escolher a região **European Union (Frankfurt)**.
2. Criar o projeto da plataforma **Next.js**, com o nome `liccont`.
3. Em *Project Settings → Security & Privacy*:
   - ligar **Prevent Storing of IP Addresses**;
   - manter **Data Scrubber** e **Use Default Scrubbers** ligados.
4. Em *Project Settings → Client Keys (DSN)*, copiar o DSN.
5. Na Vercel (*Settings → Environment Variables*), criar `NEXT_PUBLIC_SENTRY_DSN` com o
   DSN em **Preview** e **Production**. Nunca colar o DSN no chat nem no código.
6. Fazer novo deploy. A variável entra no build, então só vale para os deploys feitos
   depois dela.
7. Em *Alerts*, criar a regra "A new issue is created" → e-mail para a equipe.

Sem `NEXT_PUBLIC_SENTRY_DSN` o Sentry fica desligado (local, CI e demonstração local).

### Conferir (Preview)

1. Abrir `https://<endereço-do-preview>/api/erro-teste`. Responde erro 500. Essa rota só
   existe em Preview: em Production devolve 404.
2. Em alguns segundos aparece no Sentry o erro "Erro de teste do LicCONT".
3. Conferir que o texto do erro mostra `[cpf]`, `[e-mail]` e
   `Failing row contains [dados removidos]`, e não `123.456.789-09`, `fulana@exemplo.test`,
   "Maria Fictícia" nem "texto do documento fictício".
4. Conferir que *User* e *IP* estão vazios e que a URL não tem `?`.

## 2. Rota de saúde

`GET /api/saude` → `200 {"status":"ok","banco":"ok","storage":"ok"}`. Se uma parte falhar
(ou demorar mais de 5 s), devolve `503` com essa parte como `"falha"`. Não mostra detalhe do
erro. No modo demonstração responde `{"status":"ok","modo":"demonstracao"}`.

## 3. Checagem externa (UptimeRobot, gratuito)

1. Criar a conta em uptimerobot.com (plano Free: 50 monitores, intervalo de 5 min).
2. *New monitor* → **HTTP(s) - Keyword**:
   - URL: `https://<domínio de produção>/api/saude`;
   - Keyword: `"status":"ok"` → alertar quando **não existir**;
   - Intervalo: 5 minutos.
3. *Alert contacts*: e-mail da equipe.
4. Conferir: o monitor fica verde (Up). Para testar o alerta, apontar um monitor de
   teste para `/api/saude-inexistente` (404) e ver o e-mail chegar. Depois apagar o monitor de teste.

O UptimeRobot só vê a URL e a resposta da rota: nenhum dado pessoal.
