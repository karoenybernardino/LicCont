-- Fase 1 · Dois fatores (tarefa 5): administrador em aal1 não lê nada da
-- prefeitura; em aal2 lê. Usuário comum não depende do segundo fator.
begin;
create extension if not exists pgtap with schema extensions;
select plan(5);
-- Estes testes valem com o segundo fator obrigatório (como no piloto).
update app.configuracao set segundo_fator_obrigatorio = true;

insert into public.prefeituras (id, nome, cnpj, status) values
  ('77777777-7777-7777-7777-777777777777', 'Prefeitura Fictícia MFA', '00000000000777', 'ativa');
insert into public.secretarias (id, prefeitura_id, nome) values
  ('c7000000-0000-0000-0000-000000000000', '77777777-7777-7777-7777-777777777777', 'Saúde');
insert into auth.users (id, email) values
  ('07000000-0000-0000-0000-000000000001', 'admin.mfa@exemplo.test'),
  ('07000000-0000-0000-0000-000000000002', 'operador.mfa@exemplo.test');
insert into auth.sessions (id, user_id) values
  ('57000000-0000-0000-0000-000000000001', '07000000-0000-0000-0000-000000000001'),
  ('57000000-0000-0000-0000-000000000002', '07000000-0000-0000-0000-000000000002');
insert into public.usuarios (id, prefeitura_id, nome, administrador, troca_senha_obrigatoria) values
  ('07000000-0000-0000-0000-000000000001', '77777777-7777-7777-7777-777777777777', 'Admin MFA', true, false),
  ('07000000-0000-0000-0000-000000000002', '77777777-7777-7777-7777-777777777777', 'Operador MFA', false, false);
insert into public.vinculos (prefeitura_id, usuario_id, secretaria_id, papel) values
  ('77777777-7777-7777-7777-777777777777', '07000000-0000-0000-0000-000000000001', 'c7000000-0000-0000-0000-000000000000', 'coordenador'),
  ('77777777-7777-7777-7777-777777777777', '07000000-0000-0000-0000-000000000002', 'c7000000-0000-0000-0000-000000000000', 'operador');

create function public.tst_mfa_entrar(p_uid uuid, p_sessao uuid, p_aal text)
returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object(
    'sub', p_uid, 'role', 'authenticated', 'session_id', p_sessao, 'aal', p_aal)::text, true);
$$;
grant execute on function public.tst_mfa_entrar(uuid, uuid, text) to authenticated;

set local role authenticated;
select tst_mfa_entrar('07000000-0000-0000-0000-000000000001', '57000000-0000-0000-0000-000000000001', 'aal1');
select is_empty('select 1 from public.secretarias', 'administrador em aal1 não lê secretarias');
select is_empty('select 1 from public.vinculos', 'administrador em aal1 não lê nem o próprio vínculo');
select is_empty('select 1 from public.prefeituras', 'administrador em aal1 não lê a prefeitura');

select tst_mfa_entrar('07000000-0000-0000-0000-000000000001', '57000000-0000-0000-0000-000000000001', 'aal2');
select results_eq('select nome from public.secretarias', array['Saúde'], 'administrador em aal2 lê as secretarias');

select tst_mfa_entrar('07000000-0000-0000-0000-000000000002', '57000000-0000-0000-0000-000000000002', 'aal1');
select results_eq('select nome from public.secretarias', array['Saúde'], 'usuário comum em aal1 segue com acesso');

select * from finish();
rollback;
