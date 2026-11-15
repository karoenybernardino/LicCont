-- Fase 5 · Etiquetas: isolamento e permissões.
--   1. outra prefeitura não lê, não cria nem altera etiqueta;
--   2. etiqueta não aponta para caixa de outra prefeitura;
--   3. administrador, coordenador e operador criam; consulta não;
--   4. uma etiqueta por caixa; código aleatório gerado pelo banco e imutável;
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
-- Administrador A cria; o código nasce no banco
-- ---------------------------------------------------------------------------
set local role authenticated;
select tst_entrar('0a000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'aal2');
select lives_ok($$insert into public.etiquetas (prefeitura_id, caixa_id, tamanho)
  values ('11111111-1111-1111-1111-111111111111', 'c4a00000-0000-0000-0000-000000000001', 'pequena')$$, 'administrador cria etiqueta');
select matches((select codigo from public.etiquetas where caixa_id = 'c4a00000-0000-0000-0000-000000000001'), '^[0-9a-f]{32}$', 'código aleatório de 32 caracteres');
select throws_ok($$insert into public.etiquetas (prefeitura_id, caixa_id)
  values ('11111111-1111-1111-1111-111111111111', 'c4a00000-0000-0000-0000-000000000001')$$, '23505', null, 'uma etiqueta por caixa');
select throws_ok($$insert into public.etiquetas (prefeitura_id, caixa_id)
  values ('11111111-1111-1111-1111-111111111111', 'c4b00000-0000-0000-0000-000000000001')$$, '23503', null, 'não aponta para caixa de outra prefeitura');
select throws_ok($$update public.etiquetas set codigo = 'a' where caixa_id = 'c4a00000-0000-0000-0000-000000000001'$$, '42501', null, 'código não muda');
select lives_ok($$update public.etiquetas set impressa_em = now(), tamanho = 'media' where caixa_id = 'c4a00000-0000-0000-0000-000000000001'$$, 'marca como impressa');

-- ---------------------------------------------------------------------------
-- Administrador B: outra prefeitura não lê, não cria, não altera
-- ---------------------------------------------------------------------------
select tst_entrar('0b000000-0000-0000-0000-000000000001', '5b000000-0000-0000-0000-000000000001', 'aal2');
select is_empty($$select 1 from public.etiquetas where prefeitura_id = '11111111-1111-1111-1111-111111111111'$$, 'B não lê etiqueta de A');
select is_empty($$update public.etiquetas set tamanho = 'pequena' where caixa_id = 'c4a00000-0000-0000-0000-000000000001' returning 1$$, 'B não altera etiqueta de A');
select throws_ok($$insert into public.etiquetas (prefeitura_id, caixa_id)
  values ('11111111-1111-1111-1111-111111111111', 'c4a00000-0000-0000-0000-000000000001')$$, '42501', null, 'B não cria etiqueta em A');
select lives_ok($$insert into public.etiquetas (prefeitura_id, caixa_id)
  values ('22222222-2222-2222-2222-222222222222', 'c4b00000-0000-0000-0000-000000000001')$$, 'B cria na própria prefeitura');

-- ---------------------------------------------------------------------------
-- Papéis em A
-- ---------------------------------------------------------------------------
select tst_entrar('0a000000-0000-0000-0000-000000000004', '5a000000-0000-0000-0000-000000000004', 'aal1');
select results_eq($$select count(*)::int from public.etiquetas$$, array[1], 'consulta lê');
select is_empty($$update public.etiquetas set tamanho = 'pequena' returning 1$$, 'consulta não altera');
select throws_ok($$insert into public.etiquetas (prefeitura_id, caixa_id)
  values ('11111111-1111-1111-1111-111111111111', 'c4a00000-0000-0000-0000-000000000001')$$, '42501', null, 'consulta não cria');
select tst_entrar('0a000000-0000-0000-0000-000000000003', '5a000000-0000-0000-0000-000000000003', 'aal1');
select lives_ok($$update public.etiquetas set tamanho = 'pequena'$$, 'operador altera');
select tst_entrar('0a000000-0000-0000-0000-000000000002', '5a000000-0000-0000-0000-000000000002', 'aal1');
select lives_ok($$update public.etiquetas set tamanho = 'media'$$, 'coordenador altera');

-- ---------------------------------------------------------------------------
-- Privilégios
-- ---------------------------------------------------------------------------
reset role;
select table_privs_are('public', 'etiquetas', 'anon', array[]::text[], 'anon sem privilégio em etiquetas');
select ok(not has_table_privilege('authenticated', 'public.etiquetas', 'delete'), 'ninguém apaga etiqueta');
select ok(not has_column_privilege('authenticated', 'public.etiquetas', 'codigo', 'insert'), 'app não grava o código');

select * from finish();
rollback;
