-- Prova a convenção do LicCONT com uma tabela de exemplo que só existe
-- dentro desta transação (o ROLLBACK final apaga tudo).
-- Modelo para os testes de isolamento de toda tabela nova.
begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

-- A função de vínculo existe e só "authenticated" pode chamá-la.
select has_function('app', 'prefeitura_atual', 'app.prefeitura_atual() existe');
select ok(
  not has_function_privilege('anon', 'app.prefeitura_atual()', 'execute'),
  'anon não executa app.prefeitura_atual()'
);

-- Função nova em public não fica executável por anon/authenticated sem GRANT.
create function public.exemplo_funcao() returns int language sql as $$ select 1 $$;
select ok(
  not has_function_privilege('anon', 'public.exemplo_funcao()', 'execute'),
  'função nova não é executável por anon sem GRANT'
);
select ok(
  not has_function_privilege('authenticated', 'public.exemplo_funcao()', 'execute'),
  'função nova não é executável por authenticated sem GRANT'
);

-- Tabela nova criada como na migração de qualquer fase.
create table public.exemplo_isolamento (
  id uuid primary key default gen_random_uuid(),
  prefeitura_id uuid not null,
  descricao text not null
);

-- Sem GRANT explícito, ninguém da Data API recebe nada.
select table_privs_are(
  'public', 'exemplo_isolamento', 'anon', array[]::text[],
  'tabela nova não dá privilégio automático para anon'
);
select table_privs_are(
  'public', 'exemplo_isolamento', 'authenticated', array[]::text[],
  'tabela nova não dá privilégio automático para authenticated'
);

-- Convenção: RLS + GRANT explícito + política pela função de vínculo.
alter table public.exemplo_isolamento enable row level security;
grant select on public.exemplo_isolamento to authenticated;
create policy "le_propria_prefeitura" on public.exemplo_isolamento
  for select to authenticated
  using (prefeitura_id = (select app.prefeitura_atual()));

-- Dados fictícios.
insert into public.exemplo_isolamento (prefeitura_id, descricao) values
  ('11111111-1111-1111-1111-111111111111', 'Contrato fictício A'),
  ('22222222-2222-2222-2222-222222222222', 'Contrato fictício B');

-- Usuário da prefeitura A.
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated","app_metadata":{"prefeitura_id":"11111111-1111-1111-1111-111111111111"}}',
  true);
select results_eq(
  'select descricao from public.exemplo_isolamento',
  array['Contrato fictício A'],
  'usuário da prefeitura A vê só a linha da A'
);

-- Usuário da prefeitura B.
select set_config('request.jwt.claims',
  '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated","app_metadata":{"prefeitura_id":"22222222-2222-2222-2222-222222222222"}}',
  true);
select results_eq(
  'select descricao from public.exemplo_isolamento',
  array['Contrato fictício B'],
  'usuário da prefeitura B vê só a linha da B'
);

-- Token sem prefeitura não vê nada.
select set_config('request.jwt.claims',
  '{"sub":"cccccccc-cccc-cccc-cccc-cccccccccccc","role":"authenticated"}',
  true);
select is_empty(
  'select 1 from public.exemplo_isolamento',
  'usuário sem prefeitura no token não vê nada'
);

-- Visitante sem login não lê a tabela.
reset role;
set local role anon;
select throws_ok(
  'select 1 from public.exemplo_isolamento',
  '42501',
  null,
  'anon não tem permissão na tabela'
);

reset role;
select * from finish();
rollback;
