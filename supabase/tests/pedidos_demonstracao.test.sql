-- Site inicial: pedido de demonstração. Só service_role grava; só a equipe lê; limite por e-mail.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into public.prefeituras (id, nome, cnpj, status) values
  ('11111111-1111-1111-1111-111111111111', 'Prefeitura Fictícia A', '00000000000191', 'ativa');
insert into auth.users (id, email) values ('0a000000-0000-0000-0000-000000000001', 'admin.a@exemplo.test');
insert into auth.sessions (id, user_id) values ('5a000000-0000-0000-0000-000000000001', '0a000000-0000-0000-0000-000000000001');
insert into public.usuarios (id, prefeitura_id, nome, administrador, troca_senha_obrigatoria) values
  ('0a000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Admin A', true, false);

create function public.tst_entrar(p_uid uuid, p_sessao uuid, p_aal text)
returns void language sql as $
  select set_config('request.jwt.claims', json_build_object(
    'sub', p_uid, 'role', 'authenticated', 'session_id', p_sessao, 'aal', p_aal)::text, true);
$;
grant execute on function public.tst_entrar(uuid, uuid, text) to authenticated;

set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
select is(public.registrar_pedido_demonstracao('Pessoa Fictícia', '', 'Prefeitura Fictícia', 'a@exemplo.test', 'h1', '', ''), true, 'grava o primeiro pedido');
select public.registrar_pedido_demonstracao('Pessoa Fictícia', '', 'Prefeitura Fictícia', 'a@exemplo.test', 'h1', '', '');
select public.registrar_pedido_demonstracao('Pessoa Fictícia', '', 'Prefeitura Fictícia', 'a@exemplo.test', 'h1', '', '');
select is(public.registrar_pedido_demonstracao('Pessoa Fictícia', '', 'Prefeitura Fictícia', 'a@exemplo.test', 'h1', '', ''), false, 'o quarto do mesmo e-mail em 24 h é recusado');
select is(public.registrar_pedido_demonstracao('Outra Pessoa', '', 'Prefeitura Fictícia', 'b@exemplo.test', 'h2', '', ''), true, 'outro e-mail ainda grava');
select throws_ok($$select * from public.pedidos_demonstracao$$, '42501', null, 'service_role não lê a tabela direto');

reset role;
set local role anon;
select throws_ok($$select public.registrar_pedido_demonstracao('x y', '', 'org', 'a@b.test', 'h', '', '')$$, '42501', null, 'anon não executa a função');
select throws_ok($$select * from public.pedidos_demonstracao$$, '42501', null, 'anon não lê');

reset role;
set local role authenticated;
select tst_entrar('0a000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'aal2');
select is((select count(*) from public.pedidos_demonstracao), 0::bigint, 'administrador de prefeitura não vê pedidos');
select throws_ok($$select public.registrar_pedido_demonstracao('x y', '', 'org', 'a@b.test', 'h', '', '')$$, '42501', null, 'authenticated não executa a função');

select * from finish();
rollback;
