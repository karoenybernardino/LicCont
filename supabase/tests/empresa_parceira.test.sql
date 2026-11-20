-- Empresa parceira: dono vê as prefeituras da empresa, funcionário só as alocadas, outra empresa não lê nada.
-- Tabelas novas sem GRANT para authenticated/anon; caixas.criado_por preenchido pelo banco.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into public.parceiras (id, nome, cnpj) values
  ('f1000000-0000-0000-0000-000000000001', 'Empresa X Fictícia', '00000000000100'),
  ('f1000000-0000-0000-0000-000000000002', 'Empresa Y Fictícia', '11111111000111');
insert into public.prefeituras (id, nome, cnpj, status, parceira_id) values
  ('11111111-1111-1111-1111-111111111111', 'Prefeitura Fictícia 1', '00000000000191', 'ativa', 'f1000000-0000-0000-0000-000000000001'),
  ('22222222-2222-2222-2222-222222222222', 'Prefeitura Fictícia 2', '00000000000272', 'ativa', 'f1000000-0000-0000-0000-000000000001'),
  ('33333333-3333-3333-3333-333333333333', 'Prefeitura Fictícia 3', '00000000000353', 'ativa', 'f1000000-0000-0000-0000-000000000002');
insert into auth.users (id, email) values
  ('0d000000-0000-0000-0000-000000000001', 'dono.x@exemplo.test'),
  ('0d000000-0000-0000-0000-000000000002', 'func1.x@exemplo.test'),
  ('0d000000-0000-0000-0000-000000000003', 'func2.x@exemplo.test'),
  ('0d000000-0000-0000-0000-000000000004', 'dono.y@exemplo.test'),
  ('0e000000-0000-0000-0000-000000000001', 'equipe@exemplo.test'),
  ('0a000000-0000-0000-0000-000000000009', 'sem.vinculo@exemplo.test');
insert into auth.sessions (id, user_id) values
  ('5d000000-0000-0000-0000-000000000001', '0d000000-0000-0000-0000-000000000001'),
  ('5d000000-0000-0000-0000-000000000002', '0d000000-0000-0000-0000-000000000002'),
  ('5d000000-0000-0000-0000-000000000003', '0d000000-0000-0000-0000-000000000003'),
  ('5d000000-0000-0000-0000-000000000004', '0d000000-0000-0000-0000-000000000004'),
  ('5e000000-0000-0000-0000-000000000001', '0e000000-0000-0000-0000-000000000001'),
  ('5a000000-0000-0000-0000-000000000009', '0a000000-0000-0000-0000-000000000009');
insert into public.equipe_liccont (usuario_id) values ('0e000000-0000-0000-0000-000000000001');
insert into public.parceira_pessoas (id, parceira_id, usuario_id, nome, papel, troca_senha_obrigatoria) values
  ('b1000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000001', '0d000000-0000-0000-0000-000000000001', 'Dono X', 'dono', false),
  ('b1000000-0000-0000-0000-000000000002', 'f1000000-0000-0000-0000-000000000001', '0d000000-0000-0000-0000-000000000002', 'Func 1 X', 'funcionario', false),
  ('b1000000-0000-0000-0000-000000000003', 'f1000000-0000-0000-0000-000000000001', '0d000000-0000-0000-0000-000000000003', 'Func 2 X', 'funcionario', false),
  ('b1000000-0000-0000-0000-000000000004', 'f1000000-0000-0000-0000-000000000002', '0d000000-0000-0000-0000-000000000004', 'Dono Y', 'dono', false);
insert into public.parceira_alocacoes (pessoa_id, prefeitura_id, alocado_por) values
  ('b1000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', '0d000000-0000-0000-0000-000000000001');

insert into public.galpoes (id, prefeitura_id, nome) values
  ('c0a00000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'Galpão 1'),
  ('c0b00000-0000-0000-0000-000000000000', '33333333-3333-3333-3333-333333333333', 'Galpão 3');
insert into public.ruas (id, prefeitura_id, galpao_id, codigo) values
  ('c1a00000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'c0a00000-0000-0000-0000-000000000000', 'A'),
  ('c1b00000-0000-0000-0000-000000000000', '33333333-3333-3333-3333-333333333333', 'c0b00000-0000-0000-0000-000000000000', 'A');
insert into public.modulos (id, prefeitura_id, rua_id, numero) values
  ('c2a00000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'c1a00000-0000-0000-0000-000000000000', 1),
  ('c2b00000-0000-0000-0000-000000000000', '33333333-3333-3333-3333-333333333333', 'c1b00000-0000-0000-0000-000000000000', 1);
insert into public.niveis (id, prefeitura_id, modulo_id, numero, capacidade) values
  ('c3a00000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'c2a00000-0000-0000-0000-000000000000', 1, 6),
  ('c3b00000-0000-0000-0000-000000000000', '33333333-3333-3333-3333-333333333333', 'c2b00000-0000-0000-0000-000000000000', 1, 6);
insert into public.caixas (id, prefeitura_id, nivel_id, numero) values
  ('c4a00000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'c3a00000-0000-0000-0000-000000000000', 1),
  ('c4b00000-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 'c3b00000-0000-0000-0000-000000000000', 1);

create function public.tst_entrar(p_uid uuid, p_sessao uuid, p_aal text)
returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object(
    'sub', p_uid, 'role', 'authenticated', 'session_id', p_sessao, 'aal', p_aal)::text, true);
$$;
grant execute on function public.tst_entrar(uuid, uuid, text) to authenticated;

-- Convenção: sem GRANT para anon e authenticated nas tabelas novas.
select table_privs_are('public', 'parceira_pessoas', 'anon', array[]::text[], 'anon não acessa parceira_pessoas');
select table_privs_are('public', 'parceira_pessoas', 'authenticated', array[]::text[], 'authenticated não acessa parceira_pessoas direto');
select table_privs_are('public', 'parceira_alocacoes', 'anon', array[]::text[], 'anon não acessa parceira_alocacoes');
select table_privs_are('public', 'parceira_alocacoes', 'authenticated', array[]::text[], 'authenticated não acessa parceira_alocacoes direto');
select ok(not has_function_privilege('anon', 'public.parceira_prefeituras()', 'execute'), 'anon não executa parceira_prefeituras');
select ok(not has_function_privilege('anon', 'app.prefeituras_permitidas()', 'execute'), 'anon não executa prefeituras_permitidas');

set local role authenticated;
select tst_entrar('0d000000-0000-0000-0000-000000000001', '5d000000-0000-0000-0000-000000000001', 'aal1');
select is((select count(*) from app.prefeituras_permitidas()), 2::bigint, 'dono vê as 2 prefeituras da empresa dele');
select is((select count(*) from public.parceira_prefeituras() where id = '33333333-3333-3333-3333-333333333333'), 0::bigint, 'dono não vê prefeitura de outra empresa');
select is((select count(*) from public.caixas), 1::bigint, 'dono lê só a caixa da prefeitura dele (RLS)');
select is((select count(*) from public.parceira_equipe()), 3::bigint, 'dono lista as 3 pessoas da empresa');
select throws_ok($$select public.parceira_alocar('b1000000-0000-0000-0000-000000000003', array['33333333-3333-3333-3333-333333333333']::uuid[])$$, '23514', null, 'dono não aloca em prefeitura de outra empresa');

select tst_entrar('0d000000-0000-0000-0000-000000000002', '5d000000-0000-0000-0000-000000000002', 'aal1');
select is((select count(*) from app.prefeituras_permitidas()), 1::bigint, 'funcionário alocado vê só 1 prefeitura');
select is((select id from public.parceira_prefeituras()), '11111111-1111-1111-1111-111111111111'::uuid, 'é a prefeitura alocada');
select is((select count(*) from public.caixas), 1::bigint, 'funcionário lê só a caixa da prefeitura alocada');
select is((select count(*) from public.parceira_pesquisar('22222222-2222-2222-2222-222222222222', '')), 0::bigint, 'pesquisa em prefeitura não alocada não devolve nada');
select is((select count(*) from public.parceira_equipe()), 1::bigint, 'funcionário só se enxerga na equipe');
select is((select public.parceira_alocar('b1000000-0000-0000-0000-000000000002', array['22222222-2222-2222-2222-222222222222']::uuid[])), false, 'funcionário não aloca ninguém');
select is((select public.parceira_incluir_pessoa('f1000000-0000-0000-0000-000000000001', '0a000000-0000-0000-0000-000000000009', 'Intruso', 'funcionario')), null::uuid, 'funcionário não inclui pessoa');

select tst_entrar('0d000000-0000-0000-0000-000000000003', '5d000000-0000-0000-0000-000000000003', 'aal1');
select is((select count(*) from app.prefeituras_permitidas()), 0::bigint, 'funcionário sem alocação não vê prefeitura');
select is((select count(*) from public.caixas), 0::bigint, 'funcionário sem alocação não lê caixa (RLS)');
select is((select count(*) from public.prefeituras), 0::bigint, 'funcionário sem alocação não lê prefeitura (RLS)');
select is((select count(*) from public.parceira_atividade(null, '2000-01-01')), 0::bigint, 'funcionário sem alocação não vê atividade');

select tst_entrar('0d000000-0000-0000-0000-000000000004', '5d000000-0000-0000-0000-000000000004', 'aal1');
select is((select count(*) from app.prefeituras_permitidas()), 1::bigint, 'dono de outra empresa vê só a prefeitura dele');
select is((select count(*) from public.caixas where prefeitura_id = '11111111-1111-1111-1111-111111111111'), 0::bigint, 'outra empresa não lê caixas da X');
select is((select public.parceira_alocar('b1000000-0000-0000-0000-000000000002', array[]::uuid[])), false, 'outra empresa não mexe na alocação da X');
select is((select count(*) from public.parceira_equipe()), 1::bigint, 'outra empresa só lista a própria equipe');

select tst_entrar('0a000000-0000-0000-0000-000000000009', '5a000000-0000-0000-0000-000000000009', 'aal1');
select is((select count(*) from app.prefeituras_permitidas()), 0::bigint, 'quem não é da empresa não vê prefeitura');
select is((select count(*) from public.parceira_eu()), 0::bigint, 'quem não é da empresa não tem perfil de parceira');

-- Equipe LicCONT aloca em qualquer empresa e o "alocado por" é ela.
select tst_entrar('0e000000-0000-0000-0000-000000000001', '5e000000-0000-0000-0000-000000000001', 'aal2');
select is((select public.parceira_alocar('b1000000-0000-0000-0000-000000000003', array['22222222-2222-2222-2222-222222222222']::uuid[])), true, 'equipe aloca funcionário');
select is((select count(*) from public.parceira_equipe('f1000000-0000-0000-0000-000000000001')), 3::bigint, 'equipe lista a empresa X');

-- Alocar em prefeitura de outra empresa é recusado pelo banco (trigger).
reset role;
select throws_ok($$insert into public.parceira_alocacoes (pessoa_id, prefeitura_id, alocado_por)
  values ('b1000000-0000-0000-0000-000000000003', '33333333-3333-3333-3333-333333333333', '0e000000-0000-0000-0000-000000000001')$$,
  '23514', null, 'alocação em prefeitura de outra empresa é recusada');
select throws_ok($$insert into public.parceira_pessoas (parceira_id, usuario_id, nome, papel)
  values ('f1000000-0000-0000-0000-000000000001', '0a000000-0000-0000-0000-000000000009', 'Outro Dono', 'dono')$$,
  '23505', null, 'cada empresa tem um só dono');

-- criado_por: coluna existe (o default auth.uid() grava quem inseriu).
reset role;
select ok(exists (select 1 from information_schema.columns where table_name = 'caixas' and column_name = 'criado_por'), 'caixas tem criado_por');

select * from finish();
rollback;
