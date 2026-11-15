-- Mais de um administrador: só a equipe inclui e desativa; nunca outra prefeitura nem a equipe.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();
update app.configuracao set segundo_fator_obrigatorio = true;

insert into public.prefeituras (id, nome, cnpj, status) values
  ('11111111-1111-1111-1111-111111111111', 'Prefeitura Fictícia A', '00000000000191', 'ativa');
insert into auth.users (id, email) values
  ('0a000000-0000-0000-0000-000000000001', 'admin.a@exemplo.test'),
  ('0a000000-0000-0000-0000-000000000002', 'admin2.a@exemplo.test'),
  ('0e000000-0000-0000-0000-000000000001', 'equipe@exemplo.test'),
  ('0e000000-0000-0000-0000-000000000002', 'equipe2@exemplo.test');
insert into auth.sessions (id, user_id) values
  ('5a000000-0000-0000-0000-000000000001', '0a000000-0000-0000-0000-000000000001'),
  ('5e000000-0000-0000-0000-000000000001', '0e000000-0000-0000-0000-000000000001');
insert into public.usuarios (id, prefeitura_id, nome, administrador, troca_senha_obrigatoria) values
  ('0a000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Admin A', true, false);
insert into public.equipe_liccont (usuario_id) values
  ('0e000000-0000-0000-0000-000000000001'), ('0e000000-0000-0000-0000-000000000002');

create function public.tst_entrar(p_uid uuid, p_sessao uuid, p_aal text)
returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object(
    'sub', p_uid, 'role', 'authenticated', 'session_id', p_sessao, 'aal', p_aal)::text, true);
$$;
grant execute on function public.tst_entrar(uuid, uuid, text) to authenticated;

set local role authenticated;
select tst_entrar('0e000000-0000-0000-0000-000000000001', '5e000000-0000-0000-0000-000000000001', 'aal2');
select lives_ok($$select public.equipe_incluir_admin('11111111-1111-1111-1111-111111111111', '0a000000-0000-0000-0000-000000000002', 'Admin Dois')$$, 'equipe inclui o segundo administrador');
reset role;
select is((select count(*) from public.usuarios where prefeitura_id = '11111111-1111-1111-1111-111111111111' and administrador), 2::bigint, 'a prefeitura tem dois administradores');
set local role authenticated;
select tst_entrar('0e000000-0000-0000-0000-000000000001', '5e000000-0000-0000-0000-000000000001', 'aal2');
select throws_ok($$select public.equipe_incluir_admin('11111111-1111-1111-1111-111111111111', '0e000000-0000-0000-0000-000000000002', 'Pessoa da equipe')$$, '42501', null, 'não inclui alguém da equipe como administrador');
select is((select public.equipe_desativar_admin('11111111-1111-1111-1111-111111111111', '0a000000-0000-0000-0000-000000000002')), true, 'equipe desativa um administrador');
select is((select public.equipe_desativar_admin('11111111-1111-1111-1111-111111111111', '0a000000-0000-0000-0000-000000000002')), false, 'desativar de novo não muda nada');

select tst_entrar('0e000000-0000-0000-0000-000000000001', '5e000000-0000-0000-0000-000000000001', 'aal1');
select throws_ok($$select public.equipe_incluir_admin('11111111-1111-1111-1111-111111111111', '0a000000-0000-0000-0000-000000000002', 'x y')$$, '42501', null, 'sem 2º fator a equipe não inclui');
select throws_ok($$select public.equipe_desativar_admin('11111111-1111-1111-1111-111111111111', '0a000000-0000-0000-0000-000000000001')$$, '42501', null, 'sem 2º fator a equipe não desativa');

select tst_entrar('0a000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'aal2');
select throws_ok($$select public.equipe_incluir_admin('11111111-1111-1111-1111-111111111111', '0a000000-0000-0000-0000-000000000002', 'x y')$$, '42501', null, 'administrador de prefeitura não inclui administrador');
select throws_ok($$select public.equipe_desativar_admin('11111111-1111-1111-1111-111111111111', '0a000000-0000-0000-0000-000000000001')$$, '42501', null, 'administrador de prefeitura não desativa pela função da equipe');

reset role;
set local role anon;
select throws_ok($$select public.equipe_incluir_admin('11111111-1111-1111-1111-111111111111', '0a000000-0000-0000-0000-000000000002', 'x y')$$, '42501', null, 'anon não inclui');
select throws_ok($$select public.equipe_desativar_admin('11111111-1111-1111-1111-111111111111', '0a000000-0000-0000-0000-000000000001')$$, '42501', null, 'anon não desativa');

select * from finish();
rollback;
