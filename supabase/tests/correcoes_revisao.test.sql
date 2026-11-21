-- Correções da revisão: parceira não lê colunas de prefeituras, conta de um só mundo,
-- atividade sem id de quem é de fora, bloqueio derruba sessões.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

insert into public.parceiras (id, nome, cnpj) values
  ('f1000000-0000-0000-0000-000000000001', 'Empresa X Fictícia', '00000000000100');
insert into public.prefeituras (id, nome, cnpj, status, parceira_id, valor_mensalidade_centavos) values
  ('11111111-1111-1111-1111-111111111111', 'Prefeitura Fictícia 1', '00000000000191', 'ativa', 'f1000000-0000-0000-0000-000000000001', 123400);
insert into auth.users (id, email) values
  ('0d000000-0000-0000-0000-000000000001', 'dono.x@exemplo.test'),
  ('0d000000-0000-0000-0000-000000000002', 'func1.x@exemplo.test'),
  ('0e000000-0000-0000-0000-000000000001', 'equipe@exemplo.test'),
  ('0a000000-0000-0000-0000-000000000001', 'admin.a@exemplo.test'),
  ('0a000000-0000-0000-0000-000000000009', 'sem.vinculo@exemplo.test');
insert into auth.sessions (id, user_id) values
  ('5d000000-0000-0000-0000-000000000001', '0d000000-0000-0000-0000-000000000001'),
  ('5d000000-0000-0000-0000-000000000002', '0d000000-0000-0000-0000-000000000002'),
  ('5e000000-0000-0000-0000-000000000001', '0e000000-0000-0000-0000-000000000001');
insert into public.equipe_liccont (usuario_id) values ('0e000000-0000-0000-0000-000000000001');
insert into public.usuarios (id, prefeitura_id, nome, administrador, troca_senha_obrigatoria) values
  ('0a000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Admin A', true, false);
insert into public.parceira_pessoas (id, parceira_id, usuario_id, nome, papel, troca_senha_obrigatoria) values
  ('b1000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000001', '0d000000-0000-0000-0000-000000000001', 'Dono X', 'dono', false),
  ('b1000000-0000-0000-0000-000000000002', 'f1000000-0000-0000-0000-000000000001', '0d000000-0000-0000-0000-000000000002', 'Func 1 X', 'funcionario', false);
insert into public.parceira_alocacoes (pessoa_id, prefeitura_id, alocado_por) values
  ('b1000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', '0d000000-0000-0000-0000-000000000001');

insert into public.galpoes (id, prefeitura_id, nome) values
  ('c0a00000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'Galpão 1');
insert into public.ruas (id, prefeitura_id, galpao_id, codigo) values
  ('c1a00000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'c0a00000-0000-0000-0000-000000000000', 'A');
insert into public.modulos (id, prefeitura_id, rua_id, numero) values
  ('c2a00000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'c1a00000-0000-0000-0000-000000000000', 1);
insert into public.niveis (id, prefeitura_id, modulo_id, numero, capacidade) values
  ('c3a00000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'c2a00000-0000-0000-0000-000000000000', 1, 6);
-- Uma caixa criada por quem é de fora da empresa e outra por funcionário da empresa.
insert into public.caixas (id, prefeitura_id, nivel_id, numero, criado_por) values
  ('c4a00000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'c3a00000-0000-0000-0000-000000000000', 1, '0a000000-0000-0000-0000-000000000001'),
  ('c4a00000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'c3a00000-0000-0000-0000-000000000000', 2, '0d000000-0000-0000-0000-000000000002');

create function public.tst_entrar(p_uid uuid, p_sessao uuid, p_aal text)
returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object(
    'sub', p_uid, 'role', 'authenticated', 'session_id', p_sessao, 'aal', p_aal)::text, true);
$$;
grant execute on function public.tst_entrar(uuid, uuid, text) to authenticated;

set local role authenticated;

-- 1. Dono e funcionário não leem prefeituras direto (mensalidade e demais colunas).
select tst_entrar('0d000000-0000-0000-0000-000000000001', '5d000000-0000-0000-0000-000000000001', 'aal1');
select is((select count(*) from public.prefeituras), 0::bigint, 'dono não lê prefeituras pela Data API');
select is((select count(*) from public.prefeituras where valor_mensalidade_centavos is not null), 0::bigint, 'dono não vê mensalidade');
select is((select count(*) from public.parceira_prefeituras()), 1::bigint, 'dono ainda lê pela função');
select is((select count(*) from public.caixas), 2::bigint, 'dono ainda lê caixas da prefeitura dele');

-- 3. Atividade: id só de quem é da empresa.
select is((select count(*) from public.parceira_atividade(null, '2000-01-01') where usuario_id = '0a000000-0000-0000-0000-000000000001'), 0::bigint, 'atividade não devolve id de quem é de fora');
select is((select count(*) from public.parceira_atividade(null, '2000-01-01') where usuario_id = '0d000000-0000-0000-0000-000000000002' and pessoa = 'Func 1 X'), 1::bigint, 'atividade devolve id de quem é da empresa');

-- 2a. Conta que já é de prefeitura ou da equipe não vira pessoa da parceira.
select throws_ok($$select public.parceira_incluir_pessoa('f1000000-0000-0000-0000-000000000001', '0a000000-0000-0000-0000-000000000001', 'Admin A', 'funcionario')$$, '22023', null, 'dono não inclui conta de prefeitura');
select throws_ok($$select public.parceira_incluir_pessoa('f1000000-0000-0000-0000-000000000001', '0e000000-0000-0000-0000-000000000001', 'Equipe', 'funcionario')$$, '22023', null, 'dono não inclui conta da equipe');
select ok((select public.parceira_incluir_pessoa('f1000000-0000-0000-0000-000000000001', '0a000000-0000-0000-0000-000000000009', 'Novo', 'funcionario')) is not null, 'dono inclui conta livre');

select tst_entrar('0d000000-0000-0000-0000-000000000002', '5d000000-0000-0000-0000-000000000002', 'aal1');
select is((select count(*) from public.prefeituras), 0::bigint, 'funcionário não lê prefeituras pela Data API');
select is((select count(*) from public.prefeituras where valor_mensalidade_centavos is not null), 0::bigint, 'funcionário não vê mensalidade');

-- 2b. Equipe não inclui, como usuário de prefeitura, quem já é da parceira. 4. Bloqueio derruba sessões.
select tst_entrar('0e000000-0000-0000-0000-000000000001', '5e000000-0000-0000-0000-000000000001', 'aal2');
select throws_ok($$select public.equipe_incluir_usuario('11111111-1111-1111-1111-111111111111', '0d000000-0000-0000-0000-000000000002',
  'Func', null, 'administrador', '{}'::uuid[])$$, '42501', null, 'equipe não inclui pessoa da parceira como usuário de prefeitura');
select is((select public.parceira_ativar('b1000000-0000-0000-0000-000000000002', false)), true, 'equipe bloqueia funcionário');

reset role;
select is((select count(*) from auth.sessions where user_id = '0d000000-0000-0000-0000-000000000002'), 0::bigint, 'bloqueio apagou as sessões da pessoa');
select is((select ativa from public.parceira_pessoas where id = 'b1000000-0000-0000-0000-000000000002'), false, 'pessoa ficou inativa');

select * from finish();
rollback;
