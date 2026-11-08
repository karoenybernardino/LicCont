-- Chave do segundo fator (migração 20261108190000): desligada, administrador
-- e equipe em aal1 têm os poderes; ligada, voltam a exigir aal2. Ninguém
-- lê nem muda a chave pela API.
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

insert into public.prefeituras (id, nome, cnpj, status) values
  ('88888888-8888-8888-8888-888888888888', 'Prefeitura Fictícia Chave', '00000000000888', 'ativa');
insert into public.secretarias (id, prefeitura_id, nome) values
  ('c8000000-0000-0000-0000-000000000000', '88888888-8888-8888-8888-888888888888', 'Saúde');
insert into auth.users (id, email) values
  ('08000000-0000-0000-0000-000000000001', 'admin.chave@exemplo.test'),
  ('08000000-0000-0000-0000-000000000002', 'equipe.chave@exemplo.test');
insert into auth.sessions (id, user_id) values
  ('58000000-0000-0000-0000-000000000001', '08000000-0000-0000-0000-000000000001'),
  ('58000000-0000-0000-0000-000000000002', '08000000-0000-0000-0000-000000000002');
insert into public.usuarios (id, prefeitura_id, nome, administrador, troca_senha_obrigatoria) values
  ('08000000-0000-0000-0000-000000000001', '88888888-8888-8888-8888-888888888888', 'Admin Chave', true, false);
insert into public.equipe_liccont (usuario_id) values ('08000000-0000-0000-0000-000000000002');

create function public.tst_chave_entrar(p_uid uuid, p_sessao uuid)
returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object(
    'sub', p_uid, 'role', 'authenticated', 'session_id', p_sessao, 'aal', 'aal1')::text, true);
$$;
grant execute on function public.tst_chave_entrar(uuid, uuid) to authenticated;

select ok(not has_table_privilege('authenticated', 'app.configuracao', 'select')
  and not has_table_privilege('authenticated', 'app.configuracao', 'update')
  and not has_table_privilege('anon', 'app.configuracao', 'select'),
  'ninguém lê nem muda a chave pela API');
select ok(not has_function_privilege('anon', 'public.segundo_fator_obrigatorio()', 'execute'),
  'anon não consulta a chave');

-- Desligada.
update app.configuracao set segundo_fator_obrigatorio = false;
set local role authenticated;
select is(public.segundo_fator_obrigatorio(), false, 'app vê a chave desligada');
select tst_chave_entrar('08000000-0000-0000-0000-000000000001', '58000000-0000-0000-0000-000000000001');
select results_eq('select nome from public.secretarias', array['Saúde'],
  'chave desligada: administrador em aal1 lê as secretarias');
select ok(app.eh_admin(), 'chave desligada: administrador em aal1 é administrador');
select tst_chave_entrar('08000000-0000-0000-0000-000000000002', '58000000-0000-0000-0000-000000000002');
select ok(app.eh_equipe(), 'chave desligada: equipe em aal1 é equipe');

-- Ligada.
reset role;
update app.configuracao set segundo_fator_obrigatorio = true;
set local role authenticated;
select ok(not app.eh_equipe(), 'chave ligada: equipe em aal1 não é equipe');
select tst_chave_entrar('08000000-0000-0000-0000-000000000001', '58000000-0000-0000-0000-000000000001');
select is_empty('select 1 from public.secretarias', 'chave ligada: administrador em aal1 não lê nada');
select ok(not app.eh_admin(), 'chave ligada: administrador em aal1 não é administrador');

select * from finish();
rollback;
