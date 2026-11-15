-- Modelo editável do termo: isolamento e permissões.
--   1. outra prefeitura não lê nem escreve o modelo;
--   2. só administrador (aal2) escreve; coordenador e consulta não;
--   3. sem DELETE e sem anon. Tudo fictício, dentro da transação.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();
update app.configuracao set segundo_fator_obrigatorio = true;

-- ---------------------------------------------------------------------------
-- Dados fictícios (como postgres)
-- ---------------------------------------------------------------------------
insert into public.prefeituras (id, nome, cnpj, status) values
  ('11111111-1111-1111-1111-111111111111', 'Prefeitura Fictícia A', '00000000000191', 'ativa'),
  ('22222222-2222-2222-2222-222222222222', 'Prefeitura Fictícia B', '00000000000272', 'ativa');

insert into public.secretarias (id, prefeitura_id, nome) values
  ('a1000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'Saúde'),
  ('a2000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'Obras'),
  ('b1000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'Saúde');

insert into auth.users (id, email) values
  ('0a000000-0000-0000-0000-000000000001', 'admin1.a@exemplo.test'),
  ('0a000000-0000-0000-0000-000000000002', 'coord.a@exemplo.test'),
  ('0a000000-0000-0000-0000-000000000004', 'consulta.a@exemplo.test'),
  ('0a000000-0000-0000-0000-000000000005', 'admin2.a@exemplo.test'),
  ('0b000000-0000-0000-0000-000000000001', 'admin.b@exemplo.test');

insert into auth.sessions (id, user_id) values
  ('5a000000-0000-0000-0000-000000000001', '0a000000-0000-0000-0000-000000000001'),
  ('5a000000-0000-0000-0000-000000000002', '0a000000-0000-0000-0000-000000000002'),
  ('5a000000-0000-0000-0000-000000000004', '0a000000-0000-0000-0000-000000000004'),
  ('5a000000-0000-0000-0000-000000000005', '0a000000-0000-0000-0000-000000000005'),
  ('5b000000-0000-0000-0000-000000000001', '0b000000-0000-0000-0000-000000000001');

insert into public.usuarios (id, prefeitura_id, nome, administrador, troca_senha_obrigatoria) values
  ('0a000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Admin 1 A', true, false),
  ('0a000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Coord A', false, false),
  ('0a000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'Consulta A', false, false),
  ('0a000000-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'Admin 2 A', true, false),
  ('0b000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'Admin B', true, false);

-- Coordenador só em Saúde; consulta só em Obras.
insert into public.vinculos (prefeitura_id, usuario_id, secretaria_id, papel) values
  ('11111111-1111-1111-1111-111111111111', '0a000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000000', 'coordenador'),
  ('11111111-1111-1111-1111-111111111111', '0a000000-0000-0000-0000-000000000004', 'a2000000-0000-0000-0000-000000000000', 'consulta');

create function public.tst_entrar(p_uid uuid, p_sessao uuid, p_aal text)
returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object(
    'sub', p_uid, 'role', 'authenticated', 'session_id', p_sessao, 'aal', p_aal)::text, true);
$$;
grant execute on function public.tst_entrar(uuid, uuid, text) to authenticated;

set local role authenticated;
select tst_entrar('0a000000-0000-0000-0000-000000000002', '5a000000-0000-0000-0000-000000000002', 'aal1');
select throws_ok($$insert into public.modelos_termo (prefeitura_id, tipo, base_legal, assinaturas)
  values ('11111111-1111-1111-1111-111111111111', 'eliminacao', 'Texto', 'Responsável')$$, '42501', null, 'coordenador não cria modelo');
select tst_entrar('0a000000-0000-0000-0000-000000000004', '5a000000-0000-0000-0000-000000000004', 'aal1');
select throws_ok($$insert into public.modelos_termo (prefeitura_id, tipo, base_legal, assinaturas)
  values ('11111111-1111-1111-1111-111111111111', 'eliminacao', 'Texto', 'Responsável')$$, '42501', null, 'consulta não cria modelo');

select tst_entrar('0a000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'aal2');
select lives_ok($$insert into public.modelos_termo (prefeitura_id, tipo, base_legal, assinaturas)
  values ('11111111-1111-1111-1111-111111111111', 'eliminacao', 'Texto da prefeitura A', 'Responsável pelo arquivo')$$, 'administrador cria o modelo');
select throws_ok($$insert into public.modelos_termo (prefeitura_id, tipo, base_legal, assinaturas)
  values ('11111111-1111-1111-1111-111111111111', 'eliminacao', 'Outro', 'Outro')$$, '23505', null, 'um modelo por tipo');
select throws_ok($$insert into public.modelos_termo (prefeitura_id, tipo, base_legal, assinaturas)
  values ('22222222-2222-2222-2222-222222222222', 'eliminacao', 'Texto', 'Responsável')$$, '42501', null, 'administrador de A não cria modelo em B');
select throws_ok($$insert into public.modelos_termo (prefeitura_id, tipo, base_legal, assinaturas)
  values ('11111111-1111-1111-1111-111111111111', 'emprestimo', '', 'Responsável')$$, '23514', null, 'texto vazio é recusado');
select lives_ok($$update public.modelos_termo set base_legal = 'Texto novo' where tipo = 'eliminacao'$$, 'administrador altera o modelo');

select tst_entrar('0a000000-0000-0000-0000-000000000002', '5a000000-0000-0000-0000-000000000002', 'aal1');
select is((select count(*)::int from public.modelos_termo), 1, 'coordenador de A lê o modelo');
select is_empty($$update public.modelos_termo set base_legal = 'x' returning 1$$, 'coordenador não altera o modelo');

select tst_entrar('0b000000-0000-0000-0000-000000000001', '5b000000-0000-0000-0000-000000000001', 'aal2');
select is_empty($$select 1 from public.modelos_termo$$, 'B não lê o modelo de A');
select is_empty($$update public.modelos_termo set base_legal = 'x' returning 1$$, 'B não altera o modelo de A');

reset role;
select table_privs_are('public', 'modelos_termo', 'anon', array[]::text[], 'anon sem privilégio em modelos_termo');
select ok(not has_table_privilege('authenticated', 'public.modelos_termo', 'delete'), 'ninguém apaga modelo');

select * from finish();
rollback;
