-- Fase 1 · Acesso. Prova os critérios de pronto 1 a 4 de docs/fases/fase-1.md:
--   1. usuário não lê, inclui nem altera dado de outra prefeitura nem de
--      secretaria sem vínculo (WITH CHECK incluso);
--   2. bloqueio, senha provisória e sessão encerrada cortam o acesso na hora;
--   3. administrador sem segundo fator (aal2) não gere usuários;
--   4. auditoria não aceita UPDATE nem DELETE.
-- Tudo fictício e dentro da transação (ROLLBACK no fim).
-- "exemplo_acervo" é o modelo de política para as tabelas de acervo.
begin;
create extension if not exists pgtap with schema extensions;
select * from no_plan();

-- ---------------------------------------------------------------------------
-- Dados fictícios (como postgres)
-- ---------------------------------------------------------------------------
insert into public.prefeituras (id, nome, cnpj, status) values
  ('11111111-1111-1111-1111-111111111111', 'Prefeitura Fictícia A', '00000000000191', 'ativa'),
  ('22222222-2222-2222-2222-222222222222', 'Prefeitura Fictícia B', '00000000000272', 'ativa'),
  ('33333333-3333-3333-3333-333333333333', 'Prefeitura Fictícia C', '00000000000353', 'suspensa');

insert into public.secretarias (id, prefeitura_id, nome, ativa) values
  ('a1000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'Saúde', true),
  ('a2000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'Obras', true),
  ('a3000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'Cultura', false),
  ('b1000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'Saúde', true);

insert into auth.users (id, email) values
  ('0a000000-0000-0000-0000-000000000001', 'admin.a@exemplo.test'),
  ('0a000000-0000-0000-0000-000000000002', 'operador.a@exemplo.test'),
  ('0a000000-0000-0000-0000-000000000003', 'novo.a@exemplo.test'),
  ('0a000000-0000-0000-0000-000000000004', 'bloqueado.a@exemplo.test'),
  ('0a000000-0000-0000-0000-000000000009', 'extra.a@exemplo.test'),
  ('0b000000-0000-0000-0000-000000000001', 'operador.b@exemplo.test'),
  ('0e000000-0000-0000-0000-000000000001', 'equipe@exemplo.test');

insert into auth.sessions (id, user_id) values
  ('5a000000-0000-0000-0000-000000000001', '0a000000-0000-0000-0000-000000000001'),
  ('5a000000-0000-0000-0000-000000000002', '0a000000-0000-0000-0000-000000000002'),
  ('5a000000-0000-0000-0000-000000000003', '0a000000-0000-0000-0000-000000000003'),
  ('5a000000-0000-0000-0000-000000000004', '0a000000-0000-0000-0000-000000000004'),
  ('5b000000-0000-0000-0000-000000000001', '0b000000-0000-0000-0000-000000000001'),
  ('5e000000-0000-0000-0000-000000000001', '0e000000-0000-0000-0000-000000000001');

insert into public.usuarios (id, prefeitura_id, nome, administrador, ativo, troca_senha_obrigatoria) values
  ('0a000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Admin A', true, true, false),
  ('0a000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Operador A', false, true, false),
  ('0a000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Novo A', false, true, true),
  ('0a000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'Bloqueado A', false, false, false),
  ('0b000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'Operador B', false, true, false);

insert into public.vinculos (prefeitura_id, usuario_id, secretaria_id, papel) values
  ('11111111-1111-1111-1111-111111111111', '0a000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000000', 'operador'),
  ('11111111-1111-1111-1111-111111111111', '0a000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000000', 'consulta'),
  ('11111111-1111-1111-1111-111111111111', '0a000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000000', 'consulta'),
  ('22222222-2222-2222-2222-222222222222', '0b000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000000', 'operador');

insert into public.equipe_liccont (usuario_id) values ('0e000000-0000-0000-0000-000000000001');

-- Tabela de acervo de exemplo, com a política modelo.
create table public.exemplo_acervo (
  id uuid primary key default gen_random_uuid(),
  prefeitura_id uuid not null,
  secretaria_id uuid not null,
  descricao text not null
);
alter table public.exemplo_acervo enable row level security;
grant select, insert, update on public.exemplo_acervo to authenticated;
create policy acervo_le on public.exemplo_acervo for select to authenticated
  using (prefeitura_id = (select app.prefeitura_atual())
         and secretaria_id in (select app.secretarias_permitidas()));
create policy acervo_inclui on public.exemplo_acervo for insert to authenticated
  with check (prefeitura_id = (select app.prefeitura_atual())
              and secretaria_id in (select app.secretarias_permitidas()));
create policy acervo_altera on public.exemplo_acervo for update to authenticated
  using (prefeitura_id = (select app.prefeitura_atual())
         and secretaria_id in (select app.secretarias_permitidas()))
  with check (prefeitura_id = (select app.prefeitura_atual())
              and secretaria_id in (select app.secretarias_permitidas()));

insert into public.exemplo_acervo (prefeitura_id, secretaria_id, descricao) values
  ('11111111-1111-1111-1111-111111111111', 'a1000000-0000-0000-0000-000000000000', 'doc A Saúde'),
  ('11111111-1111-1111-1111-111111111111', 'a2000000-0000-0000-0000-000000000000', 'doc A Obras'),
  ('22222222-2222-2222-2222-222222222222', 'b1000000-0000-0000-0000-000000000000', 'doc B Saúde');

-- Simula o token do Supabase: usuário, sessão e nível do segundo fator.
create function public.tst_entrar(p_uid uuid, p_sessao uuid, p_aal text)
returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object(
    'sub', p_uid, 'role', 'authenticated', 'session_id', p_sessao, 'aal', p_aal)::text, true);
$$;
grant execute on function public.tst_entrar(uuid, uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Sem GRANT para anon em nenhuma tabela nova
-- ---------------------------------------------------------------------------
select table_privs_are('public', t, 'anon', array[]::text[], 'anon sem privilégio em ' || t)
from unnest(array['prefeituras', 'secretarias', 'usuarios', 'vinculos',
                  'equipe_liccont', 'auditoria', 'tentativas_login']) as t;
select table_privs_are('public', t, 'authenticated', array[]::text[], 'authenticated sem privilégio em ' || t)
from unnest(array['equipe_liccont', 'tentativas_login']) as t;

-- ---------------------------------------------------------------------------
-- Operador A (vínculo só com Saúde da prefeitura A)
-- ---------------------------------------------------------------------------
set local role authenticated;
select tst_entrar('0a000000-0000-0000-0000-000000000002', '5a000000-0000-0000-0000-000000000002', 'aal1');

select results_eq('select descricao from public.exemplo_acervo',
  array['doc A Saúde'], 'operador A vê só o acervo da secretaria vinculada');
select throws_ok($$insert into public.exemplo_acervo (prefeitura_id, secretaria_id, descricao)
  values ('11111111-1111-1111-1111-111111111111', 'a2000000-0000-0000-0000-000000000000', 'x')$$,
  '42501', null, 'operador A não inclui em secretaria sem vínculo');
select throws_ok($$insert into public.exemplo_acervo (prefeitura_id, secretaria_id, descricao)
  values ('22222222-2222-2222-2222-222222222222', 'b1000000-0000-0000-0000-000000000000', 'x')$$,
  '42501', null, 'operador A não inclui na prefeitura B');
select throws_ok($$update public.exemplo_acervo set secretaria_id = 'a2000000-0000-0000-0000-000000000000'
  where descricao = 'doc A Saúde'$$,
  '42501', null, 'operador A não move documento para secretaria sem vínculo (WITH CHECK)');
select is_empty($$update public.exemplo_acervo set descricao = 'alterado'
  where descricao = 'doc B Saúde' returning id$$, 'operador A não altera documento da prefeitura B');
select results_eq('select nome from public.usuarios', array['Operador A'],
  'operador A vê só o próprio cadastro');
select results_eq('select nome from public.prefeituras', array['Prefeitura Fictícia A'],
  'operador A vê só a própria prefeitura');
select results_eq('select nome from public.secretarias order by nome',
  array['Cultura', 'Obras', 'Saúde'], 'operador A vê os nomes das secretarias da própria prefeitura');
select is_empty('select 1 from public.auditoria', 'operador A não lê a auditoria');
select throws_ok($$insert into public.usuarios (id, prefeitura_id, nome)
  values ('0a000000-0000-0000-0000-000000000009', '11111111-1111-1111-1111-111111111111', 'X')$$,
  '42501', null, 'operador A não cadastra usuário');
select throws_ok($$insert into public.prefeituras (nome, cnpj) values ('Nova', '00000000000434')$$,
  '42501', null, 'operador A não cadastra prefeitura');
select throws_ok($$select public.encerrar_sessoes('0a000000-0000-0000-0000-000000000004')$$,
  '42501', null, 'operador A não encerra sessões de outro usuário');

-- Registro de auditoria pelo próprio usuário: quem e prefeitura vêm do banco.
select lives_ok($$select public.registrar_auditoria('sessao.troca_secretaria', 'secretarias',
  'a1000000-0000-0000-0000-000000000000', null, null, '203.0.113.7', 'teste')$$,
  'operador A registra evento na auditoria');

-- Operador B
select tst_entrar('0b000000-0000-0000-0000-000000000001', '5b000000-0000-0000-0000-000000000001', 'aal1');
select results_eq('select descricao from public.exemplo_acervo',
  array['doc B Saúde'], 'operador B vê só o acervo da prefeitura B');

-- ---------------------------------------------------------------------------
-- Acesso cortado na hora
-- ---------------------------------------------------------------------------
select tst_entrar('0a000000-0000-0000-0000-000000000003', '5a000000-0000-0000-0000-000000000003', 'aal1');
select is_empty('select 1 from public.exemplo_acervo', 'senha provisória: não vê acervo');
select results_eq('select troca_senha_obrigatoria from public.usuarios', array[true],
  'senha provisória: lê o próprio cadastro para saber que precisa trocar');

select tst_entrar('0a000000-0000-0000-0000-000000000004', '5a000000-0000-0000-0000-000000000004', 'aal1');
select is_empty('select 1 from public.exemplo_acervo', 'usuário bloqueado não vê acervo');
select is_empty('select 1 from public.usuarios', 'usuário bloqueado não lê nem o próprio cadastro');

select tst_entrar('0a000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'aal1');
select is_empty('select 1 from public.exemplo_acervo', 'token com sessão inexistente não vê nada');

select tst_entrar('0a000000-0000-0000-0000-000000000002', '5b000000-0000-0000-0000-000000000001', 'aal1');
select is_empty('select 1 from public.exemplo_acervo', 'token com sessão de outra pessoa não vê nada');

-- ---------------------------------------------------------------------------
-- Administrador A
-- ---------------------------------------------------------------------------
select tst_entrar('0a000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'aal1');
select is_empty('select 1 from public.exemplo_acervo', 'administrador sem segundo fator não vê acervo sem vínculo');
select is_empty($$update public.usuarios set ativo = false
  where id = '0a000000-0000-0000-0000-000000000002' returning id$$,
  'administrador sem segundo fator não bloqueia usuário');
select throws_ok($$insert into public.usuarios (id, prefeitura_id, nome)
  values ('0a000000-0000-0000-0000-000000000009', '11111111-1111-1111-1111-111111111111', 'X')$$,
  '42501', null, 'administrador sem segundo fator não cadastra usuário');

select tst_entrar('0a000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'aal2');
select results_eq('select descricao from public.exemplo_acervo order by descricao',
  array['doc A Obras', 'doc A Saúde'], 'administrador com segundo fator vê todas as secretarias da prefeitura A');
select results_eq('select count(*)::int from public.usuarios', array[4],
  'administrador vê os usuários da prefeitura A e nenhum da B');
select lives_ok($$insert into public.usuarios (id, prefeitura_id, nome)
  values ('0a000000-0000-0000-0000-000000000009', '11111111-1111-1111-1111-111111111111', 'Extra A')$$,
  'administrador com segundo fator cadastra usuário na própria prefeitura');
select throws_ok($$insert into public.usuarios (id, prefeitura_id, nome)
  values ('0b000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'X')$$,
  '42501', null, 'administrador A não cadastra usuário na prefeitura B');
select throws_ok($$update public.usuarios set prefeitura_id = '22222222-2222-2222-2222-222222222222'
  where id = '0a000000-0000-0000-0000-000000000009'$$,
  '42501', null, 'administrador A não move usuário para a prefeitura B (WITH CHECK)');
select throws_ok($$insert into public.vinculos (prefeitura_id, usuario_id, secretaria_id, papel)
  values ('11111111-1111-1111-1111-111111111111', '0a000000-0000-0000-0000-000000000009',
          'b1000000-0000-0000-0000-000000000000', 'consulta')$$,
  '23503', null, 'vínculo com secretaria de outra prefeitura é recusado');
select lives_ok($$insert into public.vinculos (prefeitura_id, usuario_id, secretaria_id, papel)
  values ('11111111-1111-1111-1111-111111111111', '0a000000-0000-0000-0000-000000000009',
          'a2000000-0000-0000-0000-000000000000', 'coordenador')$$,
  'administrador cria vínculo na própria prefeitura');
select isnt_empty('select 1 from public.auditoria', 'administrador lê a auditoria da própria prefeitura');
select throws_ok($$insert into public.prefeituras (nome, cnpj) values ('Nova', '00000000000434')$$,
  '42501', null, 'administrador não cadastra prefeitura');

select lives_ok($$select public.encerrar_sessoes('0a000000-0000-0000-0000-000000000002')$$,
  'administrador encerra as sessões do operador A');
select tst_entrar('0a000000-0000-0000-0000-000000000002', '5a000000-0000-0000-0000-000000000002', 'aal1');
select is_empty('select 1 from public.exemplo_acervo',
  'sessão encerrada: o token do operador A deixa de valer na hora');

-- ---------------------------------------------------------------------------
-- Equipe LicCONT
-- ---------------------------------------------------------------------------
select tst_entrar('0e000000-0000-0000-0000-000000000001', '5e000000-0000-0000-0000-000000000001', 'aal1');
select throws_ok($$insert into public.prefeituras (nome, cnpj) values ('Nova', '00000000000434')$$,
  '42501', null, 'equipe sem segundo fator não cadastra prefeitura');

select tst_entrar('0e000000-0000-0000-0000-000000000001', '5e000000-0000-0000-0000-000000000001', 'aal2');
select results_eq($$select count(*)::int from public.prefeituras where nome like 'Prefeitura Fictícia _'$$,
  array[3], 'equipe vê todas as prefeituras');
select lives_ok($$insert into public.prefeituras (nome, cnpj) values ('Prefeitura Fictícia D', '00000000000434')$$,
  'equipe cadastra prefeitura');
select is_empty('select 1 from public.exemplo_acervo', 'equipe não lê acervo');
select is_empty('select 1 from public.usuarios', 'equipe não lê cadastro de usuários');
select is_empty('select 1 from public.auditoria', 'equipe não lê a auditoria das prefeituras');

-- ---------------------------------------------------------------------------
-- Visitante (tela de login)
-- ---------------------------------------------------------------------------
reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select results_eq($$select nome from public.prefeituras_para_login() where nome like 'Prefeitura Fictícia _'$$,
  array['Prefeitura Fictícia A', 'Prefeitura Fictícia B'], 'login lista só prefeituras ativas, só o nome');
select results_eq($$select nome from public.secretarias_para_login('11111111-1111-1111-1111-111111111111')$$,
  array['Obras', 'Saúde'], 'login lista só secretarias ativas');
select is_empty($$select 1 from public.secretarias_para_login('33333333-3333-3333-3333-333333333333')$$,
  'login não lista secretarias de prefeitura suspensa');
select throws_ok('select 1 from public.usuarios', '42501', null, 'anon não lê usuários');
select throws_ok($$select public.login_bloqueado('0000000000000000000000000000000000000000000000000000000000000000', '203.0.113.7')$$,
  '42501', null, 'anon não consulta tentativas de login');
select throws_ok($$select public.registrar_auditoria('teste')$$, '42501', null, 'anon não grava auditoria');

-- ---------------------------------------------------------------------------
-- Servidor: força bruta e auditoria de sistema
-- ---------------------------------------------------------------------------
reset role;
set local role service_role;
select public.registrar_tentativa_login(repeat('a', 64), '203.0.113.7', false) from generate_series(1, 4);
select is(public.login_bloqueado(repeat('a', 64), '198.51.100.1'), false, '4 falhas ainda não bloqueiam a conta');
select public.registrar_tentativa_login(repeat('a', 64), '203.0.113.7', false);
select is(public.login_bloqueado(repeat('a', 64), '198.51.100.1'), true, '5 falhas em 15 min bloqueiam a conta');
select is(public.login_bloqueado(repeat('b', 64), '198.51.100.1'), false, 'outra conta em outro IP segue livre');
select public.registrar_tentativa_login(repeat('c', 64), '203.0.113.7', false) from generate_series(1, 15);
select is(public.login_bloqueado(repeat('d', 64), '203.0.113.7'), true, '20 falhas do mesmo IP bloqueiam o IP');
select lives_ok($$select public.registrar_auditoria_sistema(null, null, 'login.falha', '203.0.113.7', 'teste')$$,
  'servidor registra falha de login sem dado pessoal');

-- ---------------------------------------------------------------------------
-- Auditoria imutável (nem o dono da tabela altera)
-- ---------------------------------------------------------------------------
reset role;
select results_eq($$select usuario_id::text, prefeitura_id::text from public.auditoria
  where acao = 'sessao.troca_secretaria'$$,
  $$values ('0a000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111')$$,
  'auditoria grava quem e de qual prefeitura a partir do banco');
select throws_ok('update public.auditoria set acao = ''x''', 'P0001', null, 'auditoria não aceita UPDATE');
select throws_ok('delete from public.auditoria', 'P0001', null, 'auditoria não aceita DELETE');

select * from finish();
rollback;
