-- Site inicial: pedido de demonstração. Só service_role grava; só a equipe lê;
-- limite por e-mail (3 em 24 h), por IP (5 em 1 h) e teto global (200 por dia).
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
returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object(
    'sub', p_uid, 'role', 'authenticated', 'session_id', p_sessao, 'aal', p_aal)::text, true);
$$;
grant execute on function public.tst_entrar(uuid, uuid, text) to authenticated;

set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
select is(public.registrar_pedido_demonstracao('Pessoa Fictícia', '', 'Prefeitura Fictícia', 'a@exemplo.test', 'h1', repeat('a', 64), '', ''), 'ok', 'grava o primeiro pedido');
select lives_ok($$select public.registrar_pedido_demonstracao('Pessoa Fictícia', '', 'Prefeitura Fictícia', 'a@exemplo.test', 'h1', repeat('a', 64), '', '')$$, 'pedido de montagem');
select lives_ok($$select public.registrar_pedido_demonstracao('Pessoa Fictícia', '', 'Prefeitura Fictícia', 'a@exemplo.test', 'h1', repeat('a', 64), '', '')$$, 'pedido de montagem');
select is(public.registrar_pedido_demonstracao('Pessoa Fictícia', '', 'Prefeitura Fictícia', 'a@exemplo.test', 'h1', repeat('a', 64), '', ''), 'descartado', 'o quarto do mesmo e-mail em 24 h é descartado');
select is(public.registrar_pedido_demonstracao('Outra Pessoa', '', 'Prefeitura Fictícia', 'b@exemplo.test', 'h2', repeat('b', 64), '', ''), 'ok', 'outro e-mail e outro IP ainda grava');
-- 3 pedidos já saíram do IP "a"; mais 2 de e-mails diferentes completam 5 e o sexto é descartado.
select lives_ok($$select public.registrar_pedido_demonstracao('Pessoa Fictícia', '', 'Prefeitura Fictícia', 'c@exemplo.test', 'h3', repeat('a', 64), '', '')$$, 'pedido de montagem');
select lives_ok($$select public.registrar_pedido_demonstracao('Pessoa Fictícia', '', 'Prefeitura Fictícia', 'd@exemplo.test', 'h4', repeat('a', 64), '', '')$$, 'pedido de montagem');
select is(public.registrar_pedido_demonstracao('Pessoa Fictícia', '', 'Prefeitura Fictícia', 'e@exemplo.test', 'h5', repeat('a', 64), '', ''), 'descartado', 'o sexto pedido do mesmo IP em 1 h é descartado');
select is(public.registrar_pedido_demonstracao('Pessoa Fictícia', '', 'Prefeitura Fictícia', 'e@exemplo.test', 'h5', null, '', ''), 'ok', 'sem IP o limite por IP não se aplica');
select throws_ok($$select * from public.pedidos_demonstracao$$, '42501', null, 'service_role não lê a tabela direto');
select is(public.limpar_pedidos_demonstracao(), 0, 'nada com mais de 12 meses ainda');

reset role;
-- Guarda de 12 meses e teto global (como dono, para montar o cenário).
update public.pedidos_demonstracao set criado_em = now() - interval '13 months' where email_hash = 'h2';
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
select is(public.limpar_pedidos_demonstracao(), 1, 'apaga só o pedido com mais de 12 meses');
reset role;
insert into public.pedidos_demonstracao (nome, orgao, email, email_hash, ip_hash)
  select 'Pessoa Fictícia', 'Órgão Fictício', 'x' || g || '@exemplo.test', 'hx' || g, null from generate_series(1, 200) g;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
select is(public.registrar_pedido_demonstracao('Pessoa Fictícia', '', 'Prefeitura Fictícia', 'z@exemplo.test', 'hz', null, '', ''), 'teto', 'passou de 200 no dia: teto global');

reset role;
set local role anon;
select throws_ok($$select public.registrar_pedido_demonstracao('x y', '', 'org', 'a@b.test', 'h', null, '', '')$$, '42501', null, 'anon não executa a função');
select throws_ok($$select public.limpar_pedidos_demonstracao()$$, '42501', null, 'anon não executa a limpeza');
select throws_ok($$select * from public.pedidos_demonstracao$$, '42501', null, 'anon não lê');

reset role;
set local role authenticated;
select tst_entrar('0a000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'aal2');
select is((select count(*) from public.pedidos_demonstracao), 0::bigint, 'administrador de prefeitura não vê pedidos');
select throws_ok($$select public.registrar_pedido_demonstracao('x y', '', 'org', 'a@b.test', 'h', null, '', '')$$, '42501', null, 'authenticated não executa a função');
select throws_ok($$select public.limpar_pedidos_demonstracao()$$, '42501', null, 'authenticated não executa a limpeza');

select * from finish();
rollback;
