-- Fase 1 · Login (tarefa 4): o que o servidor do app pode na equipe LicCONT.
begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

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

select * from finish();
rollback;
