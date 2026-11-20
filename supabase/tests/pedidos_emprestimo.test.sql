-- Fase 6 · Aprovação do empréstimo: isolamento e permissões.
--   1. secretaria que exige aprovação recusa a retirada direta;
--   2. só quem cadastra pede; um pedido pendente por documento;
--   3. aprova coordenador/administrador, nunca quem pediu; outra prefeitura não;
--   4. pedido vence em 3 dias; decidido não muda; nada se apaga.
-- Tudo fictício e dentro da transação (ROLLBACK no fim).
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();
update app.configuracao set segundo_fator_obrigatorio = true;

-- ---------------------------------------------------------------------------
-- Dados fictícios (como postgres)
-- ---------------------------------------------------------------------------
insert into public.prefeituras (id, nome, cnpj, status) values
  ('11111111-1111-1111-1111-111111111111', 'Prefeitura Fictícia A', '00000000000191', 'ativa'),
  ('22222222-2222-2222-2222-222222222222', 'Prefeitura Fictícia B', '00000000000272', 'ativa');

insert into public.secretarias (id, prefeitura_id, nome) values
  ('a1000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'Saúde'),
  ('a2000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'Obras'),
  ('b1000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'Saúde');

insert into auth.users (id, email) values
  ('0a000000-0000-0000-0000-000000000001', 'admin1.a@exemplo.test'),
  ('0a000000-0000-0000-0000-000000000002', 'coord.a@exemplo.test'),
  ('0a000000-0000-0000-0000-000000000004', 'consulta.a@exemplo.test'),
  ('0a000000-0000-0000-0000-000000000005', 'admin2.a@exemplo.test'),
  ('0b000000-0000-0000-0000-000000000001', 'admin.b@exemplo.test');

insert into auth.sessions (id, user_id) values
  ('5a000000-0000-0000-0000-000000000001', '0a000000-0000-0000-0000-000000000001'),
  ('5a000000-0000-0000-0000-000000000002', '0a000000-0000-0000-0000-000000000002'),
  ('5a000000-0000-0000-0000-000000000004', '0a000000-0000-0000-0000-000000000004'),
  ('5a000000-0000-0000-0000-000000000005', '0a000000-0000-0000-0000-000000000005'),
  ('5b000000-0000-0000-0000-000000000001', '0b000000-0000-0000-0000-000000000001');

insert into public.usuarios (id, prefeitura_id, nome, administrador, troca_senha_obrigatoria) values
  ('0a000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Admin 1 A', true, false),
  ('0a000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Coord A', false, false),
  ('0a000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'Consulta A', false, false),
  ('0a000000-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'Admin 2 A', true, false),
  ('0b000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'Admin B', true, false);

-- Coordenador só em Saúde; consulta só em Obras.
insert into public.vinculos (prefeitura_id, usuario_id, secretaria_id, papel) values
  ('11111111-1111-1111-1111-111111111111', '0a000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000000', 'coordenador'),
  ('11111111-1111-1111-1111-111111111111', '0a000000-0000-0000-0000-000000000004', 'a2000000-0000-0000-0000-000000000000', 'consulta');

insert into public.galpoes (id, prefeitura_id, nome) values
  ('c0a00000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'Galpão A'),
  ('c0b00000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'Galpão B');
insert into public.ruas (id, prefeitura_id, galpao_id, codigo) values
  ('c1a00000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'c0a00000-0000-0000-0000-000000000000', 'A'),
  ('c1b00000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'c0b00000-0000-0000-0000-000000000000', 'A');
insert into public.modulos (id, prefeitura_id, rua_id, numero) values
  ('c2a00000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'c1a00000-0000-0000-0000-000000000000', 1),
  ('c2b00000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'c1b00000-0000-0000-0000-000000000000', 1);
insert into public.niveis (id, prefeitura_id, modulo_id, numero, capacidade) values
  ('c3a00000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'c2a00000-0000-0000-0000-000000000000', 1, 20),
  ('c3b00000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'c2b00000-0000-0000-0000-000000000000', 1, 20);
insert into public.caixas (id, prefeitura_id, nivel_id, numero) values
  ('c4a00000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'c3a00000-0000-0000-0000-000000000000', 1),
  ('c4b00000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'c3b00000-0000-0000-0000-000000000000', 1);

-- Documentos fictícios. Contrato conta do fim da vigência; licitação do encerramento.
--   d1 contrato vencido (apto)            d2 contrato que acabou hoje (prazo não cumprido)
--   d3 licitação de regra permanente      d4 dispensa vencida (apta)
--   d5 contrato sem data de fim           d6 contrato vencido de Obras (outra secretaria)
--   d7 contrato vencido da prefeitura B   d8 e d9 contratos vencidos (aptos), para o termo do administrador
insert into public.documentos (id, prefeitura_id, secretaria_id, caixa_id, tipo, modalidade, numero, ano, objeto) values
  ('d1000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'a1000000-0000-0000-0000-000000000000', 'c4a00000-0000-0000-0000-000000000001', 'contrato', null, '001', 2005, 'Objeto fictício um'),
  ('d1000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'a1000000-0000-0000-0000-000000000000', 'c4a00000-0000-0000-0000-000000000001', 'contrato', null, '002', 2020, 'Objeto fictício dois'),
  ('d1000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'a1000000-0000-0000-0000-000000000000', 'c4a00000-0000-0000-0000-000000000001', 'licitacao', 'concorrencia', '003', 2000, 'Objeto fictício três'),
  ('d1000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'a1000000-0000-0000-0000-000000000000', 'c4a00000-0000-0000-0000-000000000001', 'licitacao', 'dispensa', '004', 2000, 'Objeto fictício quatro'),
  ('d1000000-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'a1000000-0000-0000-0000-000000000000', 'c4a00000-0000-0000-0000-000000000001', 'contrato', null, '005', 2005, 'Objeto fictício cinco'),
  ('d1000000-0000-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111', 'a2000000-0000-0000-0000-000000000000', 'c4a00000-0000-0000-0000-000000000001', 'contrato', null, '006', 2005, 'Objeto fictício seis'),
  ('d1000000-0000-0000-0000-000000000007', '22222222-2222-2222-2222-222222222222', 'b1000000-0000-0000-0000-000000000000', 'c4b00000-0000-0000-0000-000000000001', 'contrato', null, '007', 2005, 'Objeto fictício sete'),
  ('d1000000-0000-0000-0000-000000000008', '11111111-1111-1111-1111-111111111111', 'a1000000-0000-0000-0000-000000000000', 'c4a00000-0000-0000-0000-000000000001', 'contrato', null, '008', 2005, 'Objeto fictício oito'),
  ('d1000000-0000-0000-0000-000000000009', '11111111-1111-1111-1111-111111111111', 'a1000000-0000-0000-0000-000000000000', 'c4a00000-0000-0000-0000-000000000001', 'contrato', null, '009', 2005, 'Objeto fictício nove');

create function public.tst_entrar(p_uid uuid, p_sessao uuid, p_aal text)
returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object(
    'sub', p_uid, 'role', 'authenticated', 'session_id', p_sessao, 'aal', p_aal)::text, true);
$$;
grant execute on function public.tst_entrar(uuid, uuid, text) to authenticated;

update public.secretarias set exige_aprovacao_emprestimo = true where id = 'a1000000-0000-0000-0000-000000000000';

set local role authenticated;
select tst_entrar('0a000000-0000-0000-0000-000000000002', '5a000000-0000-0000-0000-000000000002', 'aal1');
select throws_ok($$select public.registrar_emprestimo('d1000000-0000-0000-0000-000000000001', 'Pessoa Fictícia', 'Setor', app.hoje(), app.hoje() + 5, null)$$,
  'LE001', null, 'secretaria que exige aprovação recusa a retirada direta');
select lives_ok($$select public.pedir_emprestimo('d1000000-0000-0000-0000-000000000001', 'Pessoa Fictícia', 'Setor', 10, null)$$, 'coordenador pede o empréstimo');
select throws_ok($$select public.pedir_emprestimo('d1000000-0000-0000-0000-000000000001', 'Outra Pessoa', 'Setor', 10, null)$$,
  '23505', null, 'um pedido pendente por documento');
select throws_ok($$select public.pedir_emprestimo('d1000000-0000-0000-0000-000000000002', 'Pessoa Fictícia', 'Setor', 99, null)$$,
  '23514', null, 'prazo acima de 60 dias é recusado');
select throws_ok($$select public.aprovar_pedido_emprestimo((select id from public.pedidos_emprestimo limit 1))$$,
  '42501', null, 'quem pediu não aprova o próprio pedido');

select tst_entrar('0a000000-0000-0000-0000-000000000004', '5a000000-0000-0000-0000-000000000004', 'aal1');
select is_empty($$select 1 from public.pedidos_emprestimo$$, 'consulta de Obras não lê pedidos de Saúde');
select throws_ok($$select public.pedir_emprestimo('d1000000-0000-0000-0000-000000000003', 'Pessoa Fictícia', 'Setor', 10, null)$$,
  '42501', null, 'consulta não pede empréstimo');
select throws_ok($$select public.aprovar_pedido_emprestimo((select id from public.pedidos_emprestimo limit 1))$$,
  '42501', null, 'consulta não aprova');

select tst_entrar('0b000000-0000-0000-0000-000000000001', '5b000000-0000-0000-0000-000000000001', 'aal2');
select is_empty($$select 1 from public.pedidos_emprestimo$$, 'B não lê pedidos de A');
select throws_ok($$select public.aprovar_pedido_emprestimo('00000000-0000-0000-0000-000000000000')$$, '42501', null, 'B não aprova pedido de A');

select tst_entrar('0a000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'aal2');
select lives_ok($$select public.aprovar_pedido_emprestimo((select id from public.pedidos_emprestimo where documento_id = 'd1000000-0000-0000-0000-000000000001'))$$,
  'administrador aprova o pedido do coordenador');
select is((select count(*)::int from public.emprestimos where documento_id = 'd1000000-0000-0000-0000-000000000001' and devolvido_em is null), 1, 'a aprovação cria o empréstimo');
select is((select prazo_em - retirado_em from public.emprestimos where documento_id = 'd1000000-0000-0000-0000-000000000001'), 10, 'o prazo conta da aprovação');
select throws_ok($$select public.aprovar_pedido_emprestimo((select id from public.pedidos_emprestimo where documento_id = 'd1000000-0000-0000-0000-000000000001'))$$,
  '23514', null, 'pedido decidido não se aprova de novo');
select throws_ok($$update public.pedidos_emprestimo set situacao = 'pendente'$$, '42501', null, 'ninguém altera pedido direto');

-- Pedido vencido (mais de 3 dias) não se aprova.
select tst_entrar('0a000000-0000-0000-0000-000000000002', '5a000000-0000-0000-0000-000000000002', 'aal1');
select lives_ok($$select public.pedir_emprestimo('d1000000-0000-0000-0000-000000000004', 'Pessoa Fictícia', 'Setor', 5, null)$$, 'coordenador pede outro');
reset role;
alter table public.pedidos_emprestimo disable trigger pedido_emprestimo_imutavel;
update public.pedidos_emprestimo set criado_em = now() - interval '4 days' where documento_id = 'd1000000-0000-0000-0000-000000000004';
alter table public.pedidos_emprestimo enable trigger pedido_emprestimo_imutavel;
set local role authenticated;
select tst_entrar('0a000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'aal2');
select throws_ok($$select public.aprovar_pedido_emprestimo((select id from public.pedidos_emprestimo where documento_id = 'd1000000-0000-0000-0000-000000000004'))$$,
  '23514', null, 'pedido com mais de 3 dias não se aprova');
select tst_entrar('0a000000-0000-0000-0000-000000000002', '5a000000-0000-0000-0000-000000000002', 'aal1');
select lives_ok($$select public.recusar_pedido_emprestimo((select id from public.pedidos_emprestimo where documento_id = 'd1000000-0000-0000-0000-000000000004'))$$, 'quem pediu cancela o próprio pedido');

reset role;
select is_empty($$select 1 from public.auditoria where alvo_tabela = 'pedidos_emprestimo' and (depois::text like '%Pessoa Fictícia%' or depois::text like '%Setor%')$$, 'auditoria do pedido sem nome nem setor');
select table_privs_are('public', 'pedidos_emprestimo', 'anon', array[]::text[], 'anon sem privilégio em pedidos_emprestimo');
select table_privs_are('public', 'pedidos_emprestimo', 'authenticated', array['SELECT'], 'authenticated só lê pedidos_emprestimo');
select ok(not has_function_privilege('anon', 'public.aprovar_pedido_emprestimo(uuid)', 'execute'), 'anon não aprova');

select * from finish();
rollback;
