# 0013 — Pedido de demonstração gravado no banco

Data: 2026-11-15. Estado: aceita (a validar com advogado quanto ao prazo de guarda).

## Contexto
O site inicial tem o formulário "Pedir demonstração". Não há serviço de e-mail
ligado (decisão 0010 deixa o e-mail pronto para quando houver chave).

## Decisão
- O pedido é gravado na tabela `pedidos_demonstracao` (nome, cargo, órgão,
  e-mail, telefone, mensagem). Sem serviço externo novo.
- A gravação só acontece pela função `registrar_pedido_demonstracao`, executável
  apenas pelo `service_role` (servidor). `anon` e `authenticated` não executam
  nem leem. Só a equipe LicCONT lê (RLS por `app.eh_equipe()`).
- Limite: 3 pedidos por e-mail em 24 h e 200 por dia (contra abuso). O e-mail
  entra no limite só como HMAC. Campo-isca contra robô.
- Nenhum dado do formulário vai para log ou mensagem de erro. IP não é gravado.

## Pendência
Prazo de guarda e eliminação dos pedidos: propor 90 dias após a resposta, a
validar com o advogado. Hoje não há rotina automática de eliminação.
