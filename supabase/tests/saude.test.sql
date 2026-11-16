-- Rota de saúde: só o servidor (service_role) executa public.saude().
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

select ok(not has_function_privilege('anon', 'public.saude()', 'execute'), 'anon não executa saude');
select ok(not has_function_privilege('authenticated', 'public.saude()', 'execute'), 'authenticated não executa saude');
select ok(has_function_privilege('service_role', 'public.saude()', 'execute'), 'service_role executa saude');
set local role service_role;
select is(public.saude(), true, 'saude responde true');
reset role;

select * from finish();
rollback;
