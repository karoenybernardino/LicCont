-- Permissões: só a equipe LicCONT cadastra e edita secretarias e usuários.
-- O administrador da prefeitura lê, mas não escreve (nem pela Data API nem
-- pelas funções da equipe); outra prefeitura continua isolada.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();
update app.configuracao set segundo_fator_obrigatorio = true;

insert into public.prefeituras (id, nome, cnpj, status) values
  ('11111111-1111-1111-1111-111111111111', 'Prefeitura Fictícia A', '00000000000191', 'ativa'),
  ('22222222-2222-2222-2222-222222222222', 'Prefeitura Fictícia B', '00000000000272', 'ativa');
insert into auth.users (id, email) values
  ('0a000000-0000-0000-0000-000000000001', 'admin.a@exemplo.test'),
  ('0a000000-0000-0000-0000-000000000002', 'novo.a@exemplo.test'),
  ('0a000000-0000-0000-0000-000000000003', 'outro.a@exemplo.test'),
  ('0b000000-0000-0000-0000-000000000001', 'admin.b@exemplo.test'),
  ('0e000000-0000-0000-0000-000000000001', 'equipe@exemplo.test'),
  ('0e000000-0000-0000-0000-000000000002', 'equipe2@exemplo.test');
insert into auth.sessions (id, user_id) values
  ('5a000000-0000-0000-0000-000000000001', '0a000000-0000-0000-0000-000000000001'),
  ('5a000000-0000-0000-0000-000000000002', '0a000000-0000-0000-0000-000000000002'),
  ('5b000000-0000-0000-0000-000000000001', '0b000000-0000-0000-0000-000000000001'),
  ('5e000000-0000-0000-0000-000000000001', '0e000000-0000-0000-0000-000000000001');
insert into public.usuarios (id, prefeitura_id, nome, administrador, troca_senha_obrigatoria) values
  ('0a000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Admin A', true, false),
  ('0b000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'Admin B', true, false);
insert into public.secretarias (id, prefeitura_id, nome) values
  ('a1000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'Saúde'),
  ('b1000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'Saúde');
insert into public.equipe_liccont (usuario_id) values
  ('0e000000-0000-0000-0000-000000000001'), ('0e000000-0000-0000-0000-000000000002');

create function public.tst_entrar(p_uid uuid, p_sessao uuid, p_aal text)
returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object(
    'sub', p_uid, 'role', 'authenticated', 'session_id', p_sessao, 'aal', p_aal)::text, true);
$$;
grant execute on function public.tst_entrar(uuid, uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Equipe LicCONT (2º fator): cadastra e edita pelas funções
-- ---------------------------------------------------------------------------
set local role authenticated;
select tst_entrar('0e000000-0000-0000-0000-000000000001', '5e000000-0000-0000-0000-000000000001', 'aal2');
select ok((select public.equipe_salvar_secretaria('11111111-1111-1111-1111-111111111111', null, 'Obras', 'SEOB', true,
  null, null, null, null, true, true, false, true, 15::smallint, null)) is not null, 'equipe cria secretaria');
select ok((select public.equipe_salvar_secretaria('11111111-1111-1111-1111-111111111111', 'a1000000-0000-0000-0000-000000000000',
  'Saúde', 'SESAU', true, null, null, null, null, true, true, true, true, 30::smallint, null)) is not null, 'equipe altera secretaria');
select is((select public.equipe_salvar_secretaria('11111111-1111-1111-1111-111111111111', 'b1000000-0000-0000-0000-000000000000',
  'Saúde', 'X1', true, null, null, null, null, true, true, true, true, 30::smallint, null)), null::uuid,
  'equipe não altera, pela prefeitura A, a secretaria da B');
select is((select count(*) from public.equipe_listar_secretarias('11111111-1111-1111-1111-111111111111')), 2::bigint, 'equipe lista as secretarias da A');
select is((select prazo_emprestimo_dias from public.equipe_listar_secretarias('11111111-1111-1111-1111-111111111111') where sigla = 'SESAU'), 30::smallint, 'alteração gravada');

select lives_ok($$select public.equipe_incluir_usuario('11111111-1111-1111-1111-111111111111', '0a000000-0000-0000-0000-000000000002',
  'Novo A', null, 'operador', array['a1000000-0000-0000-0000-000000000000']::uuid[])$$, 'equipe inclui usuário com vínculo');
select is((select perfil from public.equipe_listar_usuarios('11111111-1111-1111-1111-111111111111') where id = '0a000000-0000-0000-0000-000000000002'),
  'operador', 'perfil gravado');
select is((select public.equipe_salvar_usuario('11111111-1111-1111-1111-111111111111', '0a000000-0000-0000-0000-000000000002',
  'Novo A', '123', 'coordenador', array['a1000000-0000-0000-0000-000000000000']::uuid[])), true, 'equipe muda o perfil');
select is((select perfil from public.equipe_listar_usuarios('11111111-1111-1111-1111-111111111111') where id = '0a000000-0000-0000-0000-000000000002'),
  'coordenador', 'perfil novo lido de volta');
select is((select public.equipe_salvar_usuario('22222222-2222-2222-2222-222222222222', '0a000000-0000-0000-0000-000000000002',
  'Novo A', null, 'consulta', array['b1000000-0000-0000-0000-000000000000']::uuid[])), false,
  'pela prefeitura B a equipe não mexe no usuário da A');
select throws_ok($$select public.equipe_incluir_usuario('11111111-1111-1111-1111-111111111111', '0a000000-0000-0000-0000-000000000003',
  'Outro', null, 'operador', array['b1000000-0000-0000-0000-000000000000']::uuid[])$$, '23503', null,
  'vínculo com secretaria de outra prefeitura é recusado');
select throws_ok($$select public.equipe_incluir_usuario('11111111-1111-1111-1111-111111111111', '0e000000-0000-0000-0000-000000000002',
  'Equipe', null, 'administrador', '{}'::uuid[])$$, '42501', null, 'não inclui alguém da equipe como usuário');
select throws_ok($$select public.equipe_incluir_usuario('11111111-1111-1111-1111-111111111111', '0a000000-0000-0000-0000-0000000000f2',
  'Sem secretaria', null, 'operador', '{}'::uuid[])$$, '23514', null, 'perfil que não é administrador precisa de secretaria');
select is((select public.equipe_bloquear_usuario('11111111-1111-1111-1111-111111111111', '0a000000-0000-0000-0000-000000000002', true)), true, 'equipe bloqueia');
select is((select ativo from public.equipe_listar_usuarios('11111111-1111-1111-1111-111111111111') where id = '0a000000-0000-0000-0000-000000000002'),
  false, 'usuário bloqueado');
select is((select public.equipe_encerrar_sessoes('11111111-1111-1111-1111-111111111111', '0a000000-0000-0000-0000-000000000002')), true, 'equipe encerra sessões');
select is((select public.equipe_encerrar_sessoes('22222222-2222-2222-2222-222222222222', '0a000000-0000-0000-0000-000000000002')), false, 'não encerra sessões de usuário de outra prefeitura');
select is((select public.equipe_marcar_troca_senha('11111111-1111-1111-1111-111111111111', '0a000000-0000-0000-0000-000000000002')), true, 'equipe marca troca de senha');

reset role;
select is((select count(*) from auth.sessions where user_id = '0a000000-0000-0000-0000-000000000002'), 0::bigint, 'sessões do usuário bloqueado caíram');
select isnt_empty($$select 1 from public.auditoria where acao = 'usuarios.senha_redefinida' and prefeitura_id = '11111111-1111-1111-1111-111111111111'$$,
  'redefinição de senha entra na auditoria');
select is_empty($$select 1 from public.auditoria where depois::text like '%Novo A%'$$, 'auditoria não leva o nome');
select is((select count(*) from public.vinculos where usuario_id = '0a000000-0000-0000-0000-000000000002'), 1::bigint, 'um vínculo gravado');

-- Equipe sem 2º fator não faz nada.
set local role authenticated;
select tst_entrar('0e000000-0000-0000-0000-000000000001', '5e000000-0000-0000-0000-000000000001', 'aal1');
select throws_ok($$select * from public.equipe_listar_usuarios('11111111-1111-1111-1111-111111111111')$$, '42501', null, 'equipe sem 2º fator não lista usuários');
select throws_ok($$select public.equipe_bloquear_usuario('11111111-1111-1111-1111-111111111111', '0a000000-0000-0000-0000-000000000001', true)$$, '42501', null, 'equipe sem 2º fator não bloqueia');

-- ---------------------------------------------------------------------------
-- Administrador da prefeitura A: lê, não escreve
-- ---------------------------------------------------------------------------
select tst_entrar('0a000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'aal2');
select is((select count(*) from public.secretarias), 2::bigint, 'administrador A lê as secretarias da própria prefeitura');
select is((select count(*) from public.usuarios), 2::bigint, 'administrador A lê os usuários da própria prefeitura');
select throws_ok($$insert into public.secretarias (prefeitura_id, nome) values ('11111111-1111-1111-1111-111111111111', 'Turismo')$$,
  '42501', null, 'administrador não cadastra secretaria');
select throws_ok($$update public.secretarias set nome = 'Alterada' where id = 'a1000000-0000-0000-0000-000000000000'$$,
  '42501', null, 'administrador não edita secretaria');
select throws_ok($$insert into public.usuarios (id, prefeitura_id, nome, troca_senha_obrigatoria)
  values ('0a000000-0000-0000-0000-0000000000f3', '11111111-1111-1111-1111-111111111111', 'X Y', true)$$,
  '42501', null, 'administrador não cadastra usuário');
select throws_ok($$update public.usuarios set nome = 'Outro Nome' where id = '0a000000-0000-0000-0000-000000000002'$$,
  '42501', null, 'administrador não edita usuário');
select throws_ok($$update public.usuarios set ativo = false where id = '0a000000-0000-0000-0000-000000000002'$$,
  '42501', null, 'administrador não bloqueia usuário pela Data API');
select throws_ok($$insert into public.vinculos (prefeitura_id, usuario_id, secretaria_id, papel)
  values ('11111111-1111-1111-1111-111111111111', '0a000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000000', 'consulta')$$,
  '42501', null, 'administrador não cria vínculo');
select throws_ok($$update public.vinculos set papel = 'consulta'$$, '42501', null, 'administrador não altera vínculo');
select throws_ok($$delete from public.vinculos$$, '42501', null, 'administrador não apaga vínculo');
select throws_ok($$select public.equipe_salvar_secretaria('11111111-1111-1111-1111-111111111111', null, 'Turismo', null, true,
  null, null, null, null, true, true, false, true, 15::smallint, null)$$, '42501', null, 'administrador não usa a função de secretaria da equipe');
select throws_ok($$select public.equipe_incluir_usuario('11111111-1111-1111-1111-111111111111', '0a000000-0000-0000-0000-0000000000f4',
  'Pessoa Nova', null, 'administrador', '{}'::uuid[])$$, '42501', null, 'administrador não usa a função de usuário da equipe');
select throws_ok($$select public.equipe_salvar_usuario('11111111-1111-1111-1111-111111111111', '0a000000-0000-0000-0000-000000000002',
  'Novo A', null, 'consulta', array['a1000000-0000-0000-0000-000000000000']::uuid[])$$, '42501', null, 'administrador não edita usuário pela função da equipe');
select throws_ok($$select public.equipe_bloquear_usuario('11111111-1111-1111-1111-111111111111', '0a000000-0000-0000-0000-000000000002', false)$$,
  '42501', null, 'administrador não desbloqueia pela função da equipe');
select throws_ok($$select * from public.equipe_listar_secretarias('11111111-1111-1111-1111-111111111111')$$, '42501', null, 'administrador não usa a listagem da equipe');

-- ---------------------------------------------------------------------------
-- Administrador da prefeitura B: nada da A
-- ---------------------------------------------------------------------------
select tst_entrar('0b000000-0000-0000-0000-000000000001', '5b000000-0000-0000-0000-000000000001', 'aal2');
select is_empty($$select 1 from public.secretarias where prefeitura_id = '11111111-1111-1111-1111-111111111111'$$, 'administrador B não lê secretarias da A');
select is_empty($$select 1 from public.usuarios where prefeitura_id = '11111111-1111-1111-1111-111111111111'$$, 'administrador B não lê usuários da A');
select throws_ok($$insert into public.secretarias (prefeitura_id, nome) values ('11111111-1111-1111-1111-111111111111', 'Intrusa')$$,
  '42501', null, 'administrador B não cria secretaria na A');

-- ---------------------------------------------------------------------------
-- Visitante
-- ---------------------------------------------------------------------------
reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select throws_ok($$select * from public.equipe_listar_usuarios('11111111-1111-1111-1111-111111111111')$$, '42501', null, 'anon não lista usuários');
select throws_ok($$select public.equipe_salvar_secretaria('11111111-1111-1111-1111-111111111111', null, 'Turismo', null, true,
  null, null, null, null, true, true, false, true, 15::smallint, null)$$, '42501', null, 'anon não grava secretaria');
select throws_ok($$select public.equipe_marcar_troca_senha('11111111-1111-1111-1111-111111111111', '0a000000-0000-0000-0000-000000000001')$$,
  '42501', null, 'anon não marca troca de senha');

reset role;
select ok(not has_function_privilege('authenticated', 'app.gravar_vinculos(uuid, uuid, text, uuid[])', 'execute'), 'a rotina interna de vínculos não é chamável pela API');
select ok(not has_table_privilege('authenticated', 'public.usuarios', 'insert'), 'authenticated sem INSERT em usuários');
select ok(not has_table_privilege('authenticated', 'public.vinculos', 'delete'), 'authenticated sem DELETE em vínculos');

select * from finish();
rollback;
