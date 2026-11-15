-- Exportação por URL assinada: bucket "exportacoes" privado; só o administrador
-- da própria prefeitura lê, grava e apaga na sua pasta; nada vaza entre
-- prefeituras; operador e anon não enxergam. aceites exige prefeitura real.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();
update app.configuracao set segundo_fator_obrigatorio = true;

insert into public.prefeituras (id, nome, cnpj, status) values
  ('11111111-1111-1111-1111-111111111111', 'Prefeitura Fictícia A', '00000000000191', 'ativa'),
  ('22222222-2222-2222-2222-222222222222', 'Prefeitura Fictícia B', '00000000000272', 'ativa');
insert into auth.users (id, email) values
  ('0a000000-0000-0000-0000-000000000001', 'admin.a@exemplo.test'),
  ('0a000000-0000-0000-0000-000000000002', 'operador.a@exemplo.test'),
  ('0b000000-0000-0000-0000-000000000001', 'admin.b@exemplo.test');
insert into auth.sessions (id, user_id) values
  ('5a000000-0000-0000-0000-000000000001', '0a000000-0000-0000-0000-000000000001'),
  ('5a000000-0000-0000-0000-000000000002', '0a000000-0000-0000-0000-000000000002'),
  ('5b000000-0000-0000-0000-000000000001', '0b000000-0000-0000-0000-000000000001');
insert into public.usuarios (id, prefeitura_id, nome, administrador, troca_senha_obrigatoria) values
  ('0a000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Admin A', true, false),
  ('0a000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Operador A', false, false),
  ('0b000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'Admin B', true, false);

create function public.tst_entrar(p_uid uuid, p_sessao uuid, p_aal text)
returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object(
    'sub', p_uid, 'role', 'authenticated', 'session_id', p_sessao, 'aal', p_aal)::text, true);
$$;
grant execute on function public.tst_entrar(uuid, uuid, text) to authenticated;

insert into storage.objects (bucket_id, name) values
  ('exportacoes', '11111111-1111-1111-1111-111111111111/exportacao-1.zip'),
  ('exportacoes', '22222222-2222-2222-2222-222222222222/exportacao-1.zip');

select results_eq($$select public from storage.buckets where id = 'exportacoes'$$, array[false], 'o bucket é privado');
select results_eq($$select file_size_limit::int from storage.buckets where id = 'exportacoes'$$, array[52428800], 'cada volume até 50 MB');

set local role anon;
select is((select count(*) from storage.objects where bucket_id = 'exportacoes'), 0::bigint, 'anon não vê exportação');

reset role;
set local role authenticated;
select tst_entrar('0a000000-0000-0000-0000-000000000002', '5a000000-0000-0000-0000-000000000002', 'aal2');
select is((select count(*) from storage.objects where bucket_id = 'exportacoes'), 0::bigint, 'operador não vê exportação');
select throws_ok($$insert into storage.objects (bucket_id, name) values ('exportacoes', '11111111-1111-1111-1111-111111111111/op.zip')$$, '42501', null, 'operador não grava');

select tst_entrar('0a000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'aal2');
select is((select count(*) from storage.objects where bucket_id = 'exportacoes'), 1::bigint, 'administrador A vê só o da prefeitura A');
select is((select count(*) from storage.objects where bucket_id = 'exportacoes' and name like '22222222%'), 0::bigint, 'administrador A não vê o da prefeitura B');
select lives_ok($$insert into storage.objects (bucket_id, name) values ('exportacoes', '11111111-1111-1111-1111-111111111111/exportacao-2.zip')$$, 'administrador A grava na própria pasta');
select throws_ok($$insert into storage.objects (bucket_id, name) values ('exportacoes', '22222222-2222-2222-2222-222222222222/invasao.zip')$$, '42501', null, 'administrador A não grava na pasta da B');
delete from storage.objects where bucket_id = 'exportacoes' and name like '22222222%';
select throws_ok($$select public.exportacoes_vencidas()$$, '42501', null, 'authenticated não lista vencidas');

reset role;
select is((select count(*) from storage.objects where bucket_id = 'exportacoes' and name like '22222222%'), 1::bigint, 'o arquivo da prefeitura B continua lá');

set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
select is((select count(*) from public.exportacoes_vencidas()), 0::bigint, 'nada vencido ainda');

reset role;
select throws_ok($$insert into public.aceites (usuario_id, prefeitura_id, documento, versao)
  values ('0a000000-0000-0000-0000-000000000001', '99999999-9999-9999-9999-999999999999', 'termos', 'v1')$$, '23503', null, 'aceite exige prefeitura existente');

select * from finish();
rollback;
