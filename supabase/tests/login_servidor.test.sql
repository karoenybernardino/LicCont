-- Fase 1 · Login (tarefa 4): o que o servidor do app pode na equipe LicCONT
-- e o limite de tentativas atômico.
begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

select ok(has_table_privilege('service_role', 'public.equipe_liccont', 'select'),
  'service_role lê equipe_liccont (conferência do login da equipe)');
select ok(not has_table_privilege('service_role', 'public.equipe_liccont', 'insert')
  and not has_table_privilege('service_role', 'public.equipe_liccont', 'update')
  and not has_table_privilege('service_role', 'public.equipe_liccont', 'delete'),
  'service_role não altera a equipe');
select ok(not has_table_privilege('authenticated', 'public.equipe_liccont', 'select'),
  'authenticated não lê equipe_liccont');
select ok(not has_table_privilege('anon', 'public.equipe_liccont', 'select'),
  'anon não lê equipe_liccont');

select ok(not has_function_privilege('anon', 'public.iniciar_tentativa_login(text, inet)', 'execute')
  and not has_function_privilege('authenticated', 'public.iniciar_tentativa_login(text, inet)', 'execute')
  and not has_function_privilege('authenticated', 'public.concluir_tentativa_login(bigint)', 'execute'),
  'só o servidor registra tentativas');

set local role service_role;
-- A tentativa nasce como falha: 5 inícios sem conclusão bloqueiam.
select isnt(public.iniciar_tentativa_login(repeat('e', 64), '203.0.113.9'), null, 'primeira tentativa é aceita')
  from generate_series(1, 5);
select is(public.iniciar_tentativa_login(repeat('e', 64), '203.0.113.9'), null,
  'sexta tentativa em 15 min é recusada');

-- Tentativa concluída com sucesso não conta como falha.
select public.concluir_tentativa_login(public.iniciar_tentativa_login(repeat('f', 64), null))
  from generate_series(1, 6);
select is(public.login_bloqueado(repeat('f', 64), null), false, 'sucessos não bloqueiam');

-- Sem IP, não há regra por IP.
select public.registrar_tentativa_login(md5(i::text) || md5(i::text), null, false) from generate_series(1, 25) i;
select is(public.login_bloqueado(repeat('9', 64), null), false, 'falhas sem IP não bloqueiam quem também está sem IP');

select * from finish();
rollback;
