-- Prova a convenção do LicCONT com uma tabela de exemplo que só existe
-- dentro desta transação (o ROLLBACK final apaga tudo).
-- O isolamento por prefeitura e secretaria (com usuários, sessões e
-- segundo fator) está em acesso_isolamento.test.sql, modelo para toda
-- tabela nova.
begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

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

-- Convenção: RLS + GRANT explícito só para authenticated.
alter table public.exemplo_isolamento enable row level security;
grant select on public.exemplo_isolamento to authenticated;

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
