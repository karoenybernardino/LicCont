# 0006 — Checagem de senha vazada (Have I Been Pwned)

Status: **aceita**. Data: 2026-11-08. Aprovada pelo responsável no plano
da Fase 1 (`docs/fases/fase-1.md`, Controles técnicos).

## Contexto

Servidores públicos tendem a reaproveitar senhas. Uma senha que já apareceu
em vazamento é a primeira que um atacante tenta. A checagem de senha vazada
do Supabase Auth é do plano pago; o projeto só usa planos gratuitos.

## Decisão

Na hora de definir ou trocar senha (tela "Crie sua senha"), o servidor do
app consulta a API gratuita de senhas do Have I Been Pwned
(`api.pwnedpasswords.com/range/`), por k-anonimato:

- calcula o SHA-1 da senha no servidor e envia **só os 5 primeiros
  caracteres** do hash; a senha e o hash completo nunca saem do servidor;
- pede respostas com enchimento (`Add-Padding: true`), para o tamanho da
  resposta não revelar nada;
- se o restante do hash aparece na resposta com contagem maior que zero, a
  senha é recusada com "Esta senha aparece em vazamentos conhecidos na
  internet. Escolha outra.";
- se o serviço não responder em 3 segundos ou der erro, a senha é aceita e
  a auditoria registra `senha.verificacao_indisponivel` (sem a senha).

Código: `src/features/login/seguranca.ts` (`verificarSenhaVazada`), com
testes em `seguranca.test.ts`. Sem conta, sem chave e sem custo.

## Consequências

- Nenhum dado pessoal sai para o serviço: entra em `docs/lgpd/suboperadores.md`
  como ferramenta sem dado pessoal.
- O IP do servidor da Vercel fica visível para o serviço (é o servidor que
  consulta, não o navegador da pessoa).
- Se o serviço sair do ar, a proteção cai em silêncio para a pessoa, mas
  fica registrada na auditoria.

## Revisar

Se o Supabase passar a oferecer a checagem no plano gratuito, ou se o
projeto for para plano pago, trocar por ela e remover esta consulta.
