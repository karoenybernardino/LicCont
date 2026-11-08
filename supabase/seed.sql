-- Dados fictícios para desenvolvimento e testes.
-- Nunca coloque aqui dado real de prefeitura, servidor ou empresa.
-- CNPJs inválidos de propósito (só zeros e dígito final).
-- Usuários de teste entram na tarefa de login (Fase 1, tarefa 4).

insert into public.prefeituras (id, nome, cnpj, status) values
  ('5eed0000-0000-0000-0000-000000000001', 'Prefeitura Fictícia de Exemplo', '00000000000809', 'ativa'),
  ('5eed0000-0000-0000-0000-000000000002', 'Prefeitura Fictícia de Teste', '00000000000990', 'ativa');

insert into public.secretarias (prefeitura_id, nome) values
  ('5eed0000-0000-0000-0000-000000000001', 'Saúde'),
  ('5eed0000-0000-0000-0000-000000000001', 'Educação'),
  ('5eed0000-0000-0000-0000-000000000001', 'Administração'),
  ('5eed0000-0000-0000-0000-000000000001', 'Obras'),
  ('5eed0000-0000-0000-0000-000000000002', 'Saúde'),
  ('5eed0000-0000-0000-0000-000000000002', 'Educação');

-- Local e CI: segundo fator obrigatório, como será no piloto (a produção
-- está com ele desligado por decisão do responsável; ver migração 20261108190000).
update app.configuracao set segundo_fator_obrigatorio = true;
