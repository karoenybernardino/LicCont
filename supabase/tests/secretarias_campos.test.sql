-- Fase 5 · Secretarias: campos novos (docs/fases/fase-5.md).
--   1. outra prefeitura não lê nem altera a secretaria;
--   2. só o administrador grava; coordenador, operador e consulta só leem;
--   3. responsável e rua preferencial de outra prefeitura (ou inexistentes)
--      são recusados com o mesmo erro;
--   4. sigla única por prefeitura; formato e prazo validados;
--   5. anon sem privilégio; ninguém apaga.
-- Tudo fictício e dentro da transação (ROLLBACK no fim).
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
  ('0a000000-0000-0000-0000-000000000001', 'admin.a@exemplo.test'),
  ('0a000000-0000-0000-0000-000000000002', 'coord.a@exemplo.test'),
  ('0a000000-0000-0000-0000-000000000003', 'operador.a@exemplo.test'),
  ('0a000000-0000-0000-0000-000000000004', 'consulta.a@exemplo.test'),
  ('0b000000-0000-0000-0000-000000000001', 'admin.b@exemplo.test'),
  ('0e000000-0000-0000-0000-000000000001', 'equipe@exemplo.test');

insert into auth.sessions (id, user_id) values
  ('5a000000-0000-0000-0000-000000000001', '0a000000-0000-0000-0000-000000000001'),
  ('5a000000-0000-0000-0000-000000000002', '0a000000-0000-0000-0000-000000000002'),
  ('5a000000-0000-0000-0000-000000000003', '0a000000-0000-0000-0000-000000000003'),
  ('5a000000-0000-0000-0000-000000000004', '0a000000-0000-0000-0000-000000000004'),
  ('5b000000-0000-0000-0000-000000000001', '0b000000-0000-0000-0000-000000000001'),
  ('5e000000-0000-0000-0000-000000000001', '0e000000-0000-0000-0000-000000000001');

insert into public.usuarios (id, prefeitura_id, nome, administrador, troca_senha_obrigatoria) values
  ('0a000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Admin A', true, false),
  ('0a000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Coord A', false, false),
  ('0a000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Operador A', false, false),
  ('0a000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'Consulta A', false, false),
  ('0b000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'Admin B', true, false);

-- Operador e consulta só em Obras; coordenador só em Saúde.
insert into public.vinculos (prefeitura_id, usuario_id, secretaria_id, papel) values
  ('11111111-1111-1111-1111-111111111111', '0a000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000000', 'coordenador'),
  ('11111111-1111-1111-1111-111111111111', '0a000000-0000-0000-0000-000000000003', 'a2000000-0000-0000-0000-000000000000', 'operador'),
  ('11111111-1111-1111-1111-111111111111', '0a000000-0000-0000-0000-000000000004', 'a2000000-0000-0000-0000-000000000000', 'consulta');

insert into public.equipe_liccont (usuario_id) values ('0e000000-0000-0000-0000-000000000001');

-- Estrutura A: Galpão A > Rua A > Módulo 1 > Nível 1 (capacidade 2) com a caixa 1.
-- Estrutura B: Galpão B > Rua A > Módulo 1 > Nível 1 (capacidade 3) com a caixa 1.
insert into public.galpoes (id, prefeitura_id, nome) values
  ('c0a00000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'Galpão A'),
  ('c0b00000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'Galpão B');
insert into public.ruas (id, prefeitura_id, galpao_id, codigo) values
  ('c1a00000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'c0a00000-0000-0000-0000-000000000000', 'A'),
  ('c1b00000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'c0b00000-0000-0000-0000-000000000000', 'A');
insert into public.modulos (id, prefeitura_id, rua_id, numero) values
  ('c2a00000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'c1a00000-0000-0000-0000-000000000000', 1),
  ('c2b00000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'c1b00000-0000-0000-0000-000000000000', 1);
insert into public.niveis (id, prefeitura_id, modulo_id, numero, capacidade) values
  ('c3a00000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'c2a00000-0000-0000-0000-000000000000', 1, 2),
  ('c3b00000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'c2b00000-0000-0000-0000-000000000000', 1, 3);
insert into public.caixas (id, prefeitura_id, nivel_id, numero) values
  ('c4a00000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'c3a00000-0000-0000-0000-000000000000', 1),
  ('c4b00000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'c3b00000-0000-0000-0000-000000000000', 1);

create function public.tst_entrar(p_uid uuid, p_sessao uuid, p_aal text)
returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object(
    'sub', p_uid, 'role', 'authenticated', 'session_id', p_sessao, 'aal', p_aal)::text, true);
$$;
grant execute on function public.tst_entrar(uuid, uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Administrador A grava os campos novos
-- ---------------------------------------------------------------------------
set local role authenticated;
select tst_entrar('0a000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'aal2');
select lives_ok($$update public.secretarias set sigla = 'SESAU', telefone = '(88) 0000-0000',
  email_contato = 'saude@exemplo.test', responsavel_id = '0a000000-0000-0000-0000-000000000002',
  cargo_responsavel = 'Secretária de Saúde', exige_aprovacao_emprestimo = true, prazo_emprestimo_dias = 30,
  rua_preferencial_id = 'c1a00000-0000-0000-0000-000000000000'
  where id = 'a1000000-0000-0000-0000-000000000000'$$, 'administrador grava os campos novos');
select results_eq($$select sigla, prazo_emprestimo_dias::int, recebe_licitacoes from public.secretarias
  where id = 'a1000000-0000-0000-0000-000000000000'$$, $$values ('SESAU', 30, true)$$, 'campos lidos de volta; padrões valem');
select lives_ok($$insert into public.secretarias (prefeitura_id, nome, sigla, recebe_contratos)
  values ('11111111-1111-1111-1111-111111111111', 'Cultura', 'SECULT', false)$$, 'administrador cria secretaria com campos novos');

-- Responsável e rua de outra prefeitura, ou inexistentes: mesmo erro.
select throws_ok($$update public.secretarias set responsavel_id = '0b000000-0000-0000-0000-000000000001'
  where id = 'a1000000-0000-0000-0000-000000000000'$$, '23503', null, 'responsável de outra prefeitura é recusado');
select throws_ok($$update public.secretarias set responsavel_id = '0a000000-0000-0000-0000-0000000000ff'
  where id = 'a1000000-0000-0000-0000-000000000000'$$, '23503', null, 'responsável inexistente dá o mesmo erro');
select throws_ok($$update public.secretarias set rua_preferencial_id = 'c1b00000-0000-0000-0000-000000000000'
  where id = 'a1000000-0000-0000-0000-000000000000'$$, '23503', null, 'rua de outra prefeitura é recusada');
select throws_ok($$update public.secretarias set rua_preferencial_id = 'c1a00000-0000-0000-0000-0000000000ff'
  where id = 'a1000000-0000-0000-0000-000000000000'$$, '23503', null, 'rua inexistente dá o mesmo erro');

-- Validações.
select throws_ok($$update public.secretarias set sigla = 'SESAU' where id = 'a2000000-0000-0000-0000-000000000000'$$,
  '23505', null, 'sigla repetida na mesma prefeitura é recusada');
select throws_ok($$update public.secretarias set sigla = 'sesau!' where id = 'a2000000-0000-0000-0000-000000000000'$$,
  '23514', null, 'sigla fora do formato é recusada');
select throws_ok($$update public.secretarias set prazo_emprestimo_dias = 0 where id = 'a2000000-0000-0000-0000-000000000000'$$,
  '23514', null, 'prazo fora do limite é recusado');
select throws_ok($$update public.secretarias set email_contato = 'sem-arroba' where id = 'a2000000-0000-0000-0000-000000000000'$$,
  '23514', null, 'e-mail sem arroba é recusado');
select throws_ok($$update public.secretarias set prefeitura_id = '22222222-2222-2222-2222-222222222222'
  where id = 'a2000000-0000-0000-0000-000000000000'$$, '42501', null, 'secretaria não muda de prefeitura');
select isnt_empty($$select 1 from public.auditoria where acao = 'secretarias.update' and alvo_id = 'a1000000-0000-0000-0000-000000000000'$$,
  'alteração dos campos entra na auditoria');

-- ---------------------------------------------------------------------------
-- Administrador B: outra prefeitura não lê, não altera; a mesma sigla vale lá
-- ---------------------------------------------------------------------------
select tst_entrar('0b000000-0000-0000-0000-000000000001', '5b000000-0000-0000-0000-000000000001', 'aal2');
select is_empty($$select 1 from public.secretarias where prefeitura_id = '11111111-1111-1111-1111-111111111111'$$,
  'administrador B não lê secretarias de A');
select is_empty($$update public.secretarias set sigla = 'HACK' where id = 'a1000000-0000-0000-0000-000000000000' returning 1$$,
  'administrador B não altera secretaria de A');
select throws_ok($$insert into public.secretarias (prefeitura_id, nome, sigla)
  values ('11111111-1111-1111-1111-111111111111', 'Intrusa', 'XX')$$, '42501', null, 'administrador B não cria secretaria em A');
select throws_ok($$update public.secretarias set responsavel_id = '0a000000-0000-0000-0000-000000000002'
  where id = 'b1000000-0000-0000-0000-000000000000'$$, '23503', null, 'B não aponta para responsável de A');
select lives_ok($$update public.secretarias set sigla = 'SESAU' where id = 'b1000000-0000-0000-0000-000000000000'$$,
  'a mesma sigla vale em outra prefeitura');

-- ---------------------------------------------------------------------------
-- Coordenador, operador e consulta: leem, não escrevem
-- ---------------------------------------------------------------------------
select tst_entrar('0a000000-0000-0000-0000-000000000002', '5a000000-0000-0000-0000-000000000002', 'aal1');
select results_eq($$select sigla from public.secretarias where id = 'a1000000-0000-0000-0000-000000000000'$$, array['SESAU'], 'coordenador lê a sigla');
select is_empty($$update public.secretarias set sigla = 'COORD' where id = 'a1000000-0000-0000-0000-000000000000' returning 1$$,
  'coordenador não altera secretaria');
select tst_entrar('0a000000-0000-0000-0000-000000000003', '5a000000-0000-0000-0000-000000000003', 'aal1');
select is_empty($$update public.secretarias set telefone = '1' where id = 'a2000000-0000-0000-0000-000000000000' returning 1$$,
  'operador não altera secretaria');
select tst_entrar('0a000000-0000-0000-0000-000000000004', '5a000000-0000-0000-0000-000000000004', 'aal1');
select is_empty($$update public.secretarias set telefone = '1' where id = 'a2000000-0000-0000-0000-000000000000' returning 1$$,
  'consulta não altera secretaria');

-- ---------------------------------------------------------------------------
-- Privilégios
-- ---------------------------------------------------------------------------
reset role;
select table_privs_are('public', 'secretarias', 'anon', array[]::text[], 'anon sem privilégio em secretarias');
select ok(not has_column_privilege('authenticated', 'public.secretarias', 'prefeitura_id', 'update'), 'prefeitura_id não muda');
select ok(not has_table_privilege('authenticated', 'public.secretarias', 'delete'), 'ninguém apaga secretaria');

select * from finish();
rollback;
