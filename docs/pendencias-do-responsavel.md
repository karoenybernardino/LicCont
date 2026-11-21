# Pendências do responsável (chaves e ajustes finais)

Itens que só o responsável faz, no fim. Nunca colar chave no chat, no código
nem no PR: só nas **variáveis de ambiente da Vercel** (Settings → Environment
Variables → Production), e depois fazer um novo deploy.

| Variável | Para quê | Obrigatória? | Como gerar |
| --- | --- | --- | --- |
| `CRON_SECRET` | Liga a limpeza diária de PDF abandonado (`/api/limpeza/envios`, agendada em `vercel.json`). Sem ela a rotina fica desligada e responde 404 | Sim, para a limpeza funcionar | Texto aleatório longo (32 caracteres ou mais), por exemplo gerado pelo gerenciador de senhas. A Vercel envia o valor sozinha no cabeçalho `Authorization: Bearer` |
| `EMAIL_API_KEY` | Chave do serviço de e-mail (decisão 0010) | Só se for ligar o aviso por e-mail | Criada na conta do serviço (Resend) |
| `EMAIL_REMETENTE` | Endereço de envio do e-mail, de um domínio verificado | Só se ligar o e-mail | Definido na conta do serviço |

Confirmações pendentes com o jurídico da prefeitura: prazo de 45 dias do edital
de ciência, texto do termo de eliminação e transferência internacional do
serviço de e-mail (decisões 0009 e 0010).
